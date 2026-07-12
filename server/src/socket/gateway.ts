import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { EventBus } from './event-bus.js';
import type { ServerEvent } from '../types/domain.js';

export function attachSocketServer(httpServer: HttpServer, bus: EventBus, corsOrigins: string[]): Server {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    socket.emit('event', {
      type: 'connection',
      payload: { online: true, reason: 'Socket connected' },
      at: new Date().toISOString(),
    } satisfies ServerEvent);

    socket.on('disconnect', () => {
      // no-op: client handles offline locally
    });
  });

  bus.subscribe((event) => {
    io.emit('event', event);
  });

  return io;
}
