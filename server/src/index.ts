import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/seed.js';
import { buildApiRouter } from './routes/index.js';
import { EventBus } from './socket/event-bus.js';
import { attachSocketServer } from './socket/gateway.js';
import { startSimulation } from './socket/simulation.js';
import { chaosMiddleware, optionalAuth } from './middleware/auth.js';

initializeDatabase();

const app = express();
const origins = (process.env.CORS_ORIGIN ?? 'http://127.0.0.1:4200,http://localhost:4201,http://127.0.0.1:4201').split(',').map((v) => v.trim());
app.use(cors({ origin: origins, credentials: true }));
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
  console.log(`[gourmetos-api] empty DB — create account via POST /api/register`);
});

process.on('SIGINT', () => {
  stopSimulation?.();
  server.close(() => process.exit(0));
});
