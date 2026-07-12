import { db } from '../db/database.js';
import type { KitchenSnapshotDto } from './domain.js';

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
