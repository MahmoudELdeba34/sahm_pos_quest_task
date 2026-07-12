import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dbPath = process.env.DB_PATH ?? './data/gourmetos.sqlite';
const absolute = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
fs.mkdirSync(path.dirname(absolute), { recursive: true });

export const db = new Database(absolute);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('cashier','kitchen','manager','support')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      price REAL NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      tags TEXT NOT NULL DEFAULT '[]',
      available INTEGER NOT NULL DEFAULT 1,
      inventory_stock INTEGER,
      low_stock_threshold INTEGER
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      table_number TEXT,
      delivery_address TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      is_delayed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      notes TEXT,
      allergens TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS order_timeline (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT,
      action TEXT NOT NULL,
      description TEXT,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kitchen_snapshot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      level TEXT NOT NULL,
      overall_percent INTEGER NOT NULL,
      stations_json TEXT NOT NULL,
      delayed_order_ids TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      severity TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      term TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_actions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  try { db.exec('ALTER TABLE products ADD COLUMN inventory_stock INTEGER;'); } catch {}
  try { db.exec('ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER;'); } catch {}
  try { db.exec('ALTER TABLE orders ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE orders ADD COLUMN tax REAL NOT NULL DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE orders ADD COLUMN discount REAL NOT NULL DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE order_items ADD COLUMN discount REAL DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE order_items ADD COLUMN tax REAL DEFAULT 0;'); } catch {}
  try { db.exec('ALTER TABLE order_items ADD COLUMN subtotal REAL DEFAULT 0;'); } catch {}
}
