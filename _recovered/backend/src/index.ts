import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/seed.js';
import { disconnectMongo } from './db/connection.js';
import { buildApiRouter } from './routes/index.js';
import { EventBus } from './socket/event-bus.js';
import { attachSocketServer } from './socket/gateway.js';
import { startSimulation } from './socket/simulation.js';
import { chaosMiddleware, optionalAuth } from './middleware/auth.js';

await initializeDatabase();

const app = express();
const defaultOrigins = [
  'http://127.0.0.1:4200',
  'http://127.0.0.1:4201',
  'http://localhost:4200',
  'http://localhost:4201',
];
const origins = (process.env.CORS_ORIGIN ?? defaultOrigins.join(','))
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(chaosMiddleware);
app.use(optionalAuth);

const bus = new EventBus();
app.use('/api', buildApiRouter(bus));

const server = http.createServer(app);
attachSocketServer(server, bus, origins);

let stopSimulation: (() => void) | undefined;
if ((process.env.SIMULATION_ENABLED ?? 'false') === 'true') {
  stopSimulation = startSimulation(bus);
}

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`[gourmetos-api] listening on http://127.0.0.1:${port}`);
  console.log(`[gourmetos-api] MongoDB Atlas — create account via POST /api/register`);
});

process.on('SIGINT', () => {
  stopSimulation?.();
  void disconnectMongo().finally(() => {
    server.close(() => process.exit(0));
  });
});
