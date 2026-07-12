import { v4 as uuid } from 'uuid';
import { db } from '../db/database.js';
import type { KitchenSnapshotDto, OrderDto, OrderItemDto, OrderStatus, ProductDto, OrderTimelineEventDto } from '../types/domain.js';

function mapItems(orderId: string): OrderItemDto[] {
  const rows = db
    .prepare(`SELECT * FROM order_items WHERE order_id = ?`)
    .all(orderId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    discount: Number(row.discount || 0),
    tax: Number(row.tax || 0),
    subtotal: Number(row.subtotal || (Number(row.quantity) * Number(row.unit_price))),
    notes: row.notes ? String(row.notes) : undefined,
    allergens: JSON.parse(String(row.allergens || '[]')) as string[],
  }));
}

function mapTimeline(orderId: string): OrderTimelineEventDto[] {
  const rows = db
    .prepare(`SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC`)
    .all(orderId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    status: row.status ? (row.status as OrderStatus) : undefined,
    action: String(row.action),
    description: row.description ? String(row.description) : undefined,
    actor: String(row.actor) as 'system' | 'cashier' | 'kitchen' | 'manager' | 'customer',
    createdAt: String(row.created_at),
  }));
}

export function mapOrder(row: Record<string, unknown>): OrderDto {
  return {
    id: String(row.id),
    number: String(row.number),
    channel: row.channel as OrderDto['channel'],
    status: row.status as OrderDto['status'],
    priority: row.priority as OrderDto['priority'],
    customerName: String(row.customer_name),
    tableNumber: row.table_number ? String(row.table_number) : undefined,
    deliveryAddress: row.delivery_address ? String(row.delivery_address) : undefined,
    items: mapItems(String(row.id)),
    subtotal: Number(row.subtotal || 0),
    tax: Number(row.tax || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total),
    timeline: mapTimeline(String(row.id)),
    estimatedMinutes: Number(row.estimated_minutes),
    isDelayed: Boolean(row.is_delayed),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function listOrders(filters?: { status?: string; channel?: string }): OrderDto[] {
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params: string[] = [];
  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.channel) {
    sql += ' AND channel = ?';
    params.push(filters.channel);
  }
  sql += ' ORDER BY updated_at DESC';
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  return rows.map(mapOrder);
}

export function getOrder(id: string): OrderDto | null {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapOrder(row) : null;
}

export function updateOrderStatus(id: string, status: OrderStatus): OrderDto | null {
  const existing = getOrder(id);
  if (!existing) return null;
  const updatedAt = new Date().toISOString();
  db.prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`).run(status, updatedAt, id);
  db.prepare(`
    INSERT INTO order_timeline (id, order_id, status, action, description, actor, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuid(), id, status, 'status_change', 'Status changed to ' + status, 'system', updatedAt);
  return getOrder(id);
}

export function markOrdersDelayed(ids: string[]): OrderDto[] {
  const updated: OrderDto[] = [];
  const stmt = db.prepare(`
    UPDATE orders
    SET is_delayed = 1,
        priority = CASE WHEN priority = 'normal' THEN 'high' ELSE 'urgent' END,
        updated_at = ?
    WHERE id = ? AND is_delayed = 0
  `);
  const timelineStmt = db.prepare(`
    INSERT INTO order_timeline (id, order_id, action, description, actor, created_at)
    VALUES (?, ?, 'delayed', 'Order delayed due to kitchen load', 'system', ?)
  `);
  const now = new Date().toISOString();
  for (const id of ids) {
    const res = stmt.run(now, id);
    if (res.changes > 0) {
      timelineStmt.run(uuid(), id, now);
      const order = getOrder(id);
      if (order) updated.push(order);
    }
  }
  return updated;
}

export function createIncomingOrder(): OrderDto {
  const channels = ['walk-in', 'delivery', 'online'] as const;
  const channel = channels[Math.floor(Math.random() * channels.length)];
  const now = new Date().toISOString();
  const id = uuid();
  const number = `${channel === 'walk-in' ? 'A' : channel === 'delivery' ? 'D' : 'O'}-${Math.floor(1000 + Math.random() * 9000)}`;
  const qty = 1 + Math.floor(Math.random() * 2);
  const unitPrice = 40 + Math.floor(Math.random() * 160);
  const total = qty * unitPrice;
  db.prepare(`
    INSERT INTO orders (
      id, number, channel, status, priority, customer_name, table_number, delivery_address,
      subtotal, tax, discount, total, estimated_minutes, is_delayed, created_at, updated_at
    ) VALUES (?, ?, ?, 'received', ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?)
  `).run(
    id,
    number,
    channel,
    Math.random() > 0.7 ? 'high' : 'normal',
    ['Youssef Ali', 'Mona Saeed', 'Karim Adel', 'Hana Tarek'][Math.floor(Math.random() * 4)],
    channel === 'walk-in' ? String(1 + Math.floor(Math.random() * 20)) : null,
    channel === 'delivery' ? 'Nasr City delivery zone' : null,
    total,
    0, // tax
    total, // total
    12 + Math.floor(Math.random() * 20),
    now,
    now,
  );
  db.prepare(`
    INSERT INTO order_items (id, order_id, name, quantity, unit_price, subtotal, tax, discount, notes, allergens)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, NULL, '[]')
  `).run(uuid(), id, ['Chicken Plate', 'Burger Combo', 'Pasta Bowl'][Math.floor(Math.random() * 3)], qty, unitPrice, total);

  db.prepare(`
    INSERT INTO order_timeline (id, order_id, status, action, description, actor, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuid(), id, 'received', 'created', 'Order created via ' + channel, 'customer', now);
  return getOrder(id)!;
}

export function searchProducts(term: string, category?: string | null, limit = 40): { products: ProductDto[]; total: number } {
  let sql = `
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.available = 1
  `;
  const params: Array<string | number> = [];
  if (category) {
    sql += ' AND c.name = ?';
    params.push(category);
  }
  if (term.trim()) {
    sql += ' AND (LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.tags) LIKE ?)';
    const like = `%${term.trim().toLowerCase()}%`;
    params.push(like, like, like);
  }
  const countSql = `SELECT COUNT(*) as c FROM (${sql})`;
  const total = (db.prepare(countSql).get(...params) as { c: number }).c;
  sql += ' ORDER BY p.name ASC LIMIT ?';
  params.push(limit);
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  const products = rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    category: String(row.category_name),
    price: Number(row.price),
    sku: String(row.sku),
    tags: JSON.parse(String(row.tags || '[]')) as string[],
    available: Boolean(row.available),
  }));
  return { products, total };
}

export function listCategories(): string[] {
  return (db.prepare('SELECT name FROM categories ORDER BY name').all() as Array<{ name: string }>).map((r) => r.name);
}

export function getKitchen(): KitchenSnapshotDto {
  const row = db.prepare('SELECT * FROM kitchen_snapshot WHERE id = 1').get() as Record<string, unknown>;
  return {
    level: row.level as KitchenSnapshotDto['level'],
    overallPercent: Number(row.overall_percent),
    stations: JSON.parse(String(row.stations_json)),
    delayedOrderIds: JSON.parse(String(row.delayed_order_ids)),
    updatedAt: String(row.updated_at),
  };
}

export function saveKitchen(snapshot: KitchenSnapshotDto): void {
  db.prepare(`
    UPDATE kitchen_snapshot
    SET level = ?, overall_percent = ?, stations_json = ?, delayed_order_ids = ?, updated_at = ?
    WHERE id = 1
  `).run(
    snapshot.level,
    snapshot.overallPercent,
    JSON.stringify(snapshot.stations),
    JSON.stringify(snapshot.delayedOrderIds),
    snapshot.updatedAt,
  );
}

export function listNotifications(): Array<Record<string, unknown>> {
  return db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all() as Array<Record<string, unknown>>;
}
