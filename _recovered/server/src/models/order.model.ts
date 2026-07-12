import { v4 as uuid } from 'uuid';
import { db } from '../db/database.js';
import type { OrderDto, OrderItemDto, OrderStatus } from './domain.js';

function mapItems(orderId: string): OrderItemDto[] {
  const rows = db
    .prepare(`SELECT * FROM order_items WHERE order_id = ?`)
    .all(orderId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    notes: row.notes ? String(row.notes) : undefined,
    allergens: JSON.parse(String(row.allergens || '[]')) as string[],
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
    total: Number(row.total),
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
  const now = new Date().toISOString();
  for (const id of ids) {
    stmt.run(now, id);
    const order = getOrder(id);
    if (order) updated.push(order);
  }
  return updated;
}

export function createIncomingOrder(): OrderDto {
  const channels = ['walk-in', 'delivery', 'online'] as const;
  const channel = channels[Math.floor(Math.random() * channels.length)];
  return createOrder({
    channel,
    status: 'received',
    priority: Math.random() > 0.7 ? 'high' : 'normal',
    customerName: ['Youssef Ali', 'Mona Saeed', 'Karim Adel', 'Hana Tarek'][Math.floor(Math.random() * 4)],
    tableNumber: channel === 'walk-in' ? String(1 + Math.floor(Math.random() * 20)) : undefined,
    deliveryAddress: channel === 'delivery' ? 'Nasr City delivery zone' : undefined,
    estimatedMinutes: 12 + Math.floor(Math.random() * 20),
    items: [
      {
        name: ['Chicken Plate', 'Burger Combo', 'Pasta Bowl'][Math.floor(Math.random() * 3)],
        quantity: 1 + Math.floor(Math.random() * 2),
        unitPrice: 40 + Math.floor(Math.random() * 160),
      },
    ],
  });
}

export function createOrder(input: {
  channel: OrderDto['channel'];
  status?: OrderStatus;
  priority?: OrderDto['priority'];
  customerName: string;
  tableNumber?: string;
  deliveryAddress?: string;
  estimatedMinutes?: number;
  isDelayed?: boolean;
  number?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    allergens?: string[];
  }>;
}): OrderDto {
  const now = new Date().toISOString();
  const id = uuid();
  const channel = input.channel;
  const number =
    input.number ??
    `${channel === 'walk-in' ? 'A' : channel === 'delivery' ? 'D' : 'O'}-${Math.floor(1000 + Math.random() * 9000)}`;
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  db.prepare(`
    INSERT INTO orders (
      id, number, channel, status, priority, customer_name, table_number, delivery_address,
      total, estimated_minutes, is_delayed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    number,
    channel,
    input.status ?? 'received',
    input.priority ?? 'normal',
    input.customerName,
    input.tableNumber ?? null,
    input.deliveryAddress ?? null,
    total,
    input.estimatedMinutes ?? 15,
    input.isDelayed ? 1 : 0,
    now,
    now,
  );

  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, name, quantity, unit_price, notes, allergens)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of input.items) {
    insertItem.run(
      uuid(),
      id,
      item.name,
      item.quantity,
      item.unitPrice,
      item.notes ?? null,
      JSON.stringify(item.allergens ?? []),
    );
  }

  return getOrder(id)!;
}

export function deleteOrder(id: string): boolean {
  const result = db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  return result.changes > 0;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = ['received', 'preparing', 'ready', 'delivered', 'completed'];
