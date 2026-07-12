import { connectMongo } from './connection.js';
import { ensureKitchenSnapshot } from '../models/kitchen.model.js';

/** Connect MongoDB and ensure required base documents exist (no demo seed data). */
export async function initializeDatabase(): Promise<void> {
  await connectMongo();
  await ensureKitchenSnapshot();
}
