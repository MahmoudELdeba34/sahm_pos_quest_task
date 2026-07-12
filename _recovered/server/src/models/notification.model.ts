import { v4 as uuid } from 'uuid';
import { db } from '../db/database.js';
import type { NotificationDto } from './domain.js';

function mapNotification(n: Record<string, unknown>): NotificationDto {
  return {
    id: String(n.id),
    title: String(n.title),
    body: String(n.body),
    severity: n.severity as NotificationDto['severity'],
    read: Boolean(n.read),
    createdAt: String(n.created_at),
  };
}

export function listNotifications(): NotificationDto[] {
  const rows = db
    .prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50')
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapNotification);
}

export function createNotification(input: {
  title: string;
  body: string;
  severity?: NotificationDto['severity'];
}): NotificationDto {
  const id = uuid();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO notifications (id, title, body, severity, read, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
  ).run(id, input.title, input.body, input.severity ?? 'info', createdAt);
  return { id, title: input.title, body: input.body, severity: input.severity ?? 'info', read: false, createdAt };
}

export function markNotificationRead(id: string, read = true): NotificationDto | null {
  const result = db.prepare(`UPDATE notifications SET read = ? WHERE id = ?`).run(read ? 1 : 0, id);
  if (!result.changes) return null;
  const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as Record<string, unknown>;
  return mapNotification(row);
}

export function deleteNotification(id: string): boolean {
  return db.prepare('DELETE FROM notifications WHERE id = ?').run(id).changes > 0;
}
