import { db, migrate } from './database.js';

/**
 * Schema only — no demo users/orders/products.
 * Optional kitchen row so GET /kitchen always has a snapshot to read/update.
 */
export function initializeDatabase(): void {
  migrate();

  const kitchen = db.prepare('SELECT id FROM kitchen_snapshot WHERE id = 1').get();
  if (!kitchen) {
    db.prepare(`
      INSERT INTO kitchen_snapshot (id, level, overall_percent, stations_json, delayed_order_ids, updated_at)
      VALUES (1, 'low', 0, '[]', '[]', ?)
    `).run(new Date().toISOString());
  }
}

/** @deprecated Use initializeDatabase — kept so old scripts don't break. */
export function seedIfEmpty(): void {
  initializeDatabase();
}
