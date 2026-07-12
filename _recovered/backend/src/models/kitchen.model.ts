import mongoose, { Schema } from 'mongoose';
import type { KitchenSnapshotDto } from './domain.js';

const KITCHEN_ID = 'kitchen-main';

const kitchenSchema = new Schema(
  {
    _id: { type: String, default: KITCHEN_ID },
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    overallPercent: { type: Number, default: 0 },
    stations: { type: Array, default: [] },
    delayedOrderIds: { type: [String], default: [] },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

const KitchenModel = mongoose.models.KitchenSnapshot || mongoose.model('KitchenSnapshot', kitchenSchema);

function toDto(row: Record<string, unknown>): KitchenSnapshotDto {
  return {
    level: row.level as KitchenSnapshotDto['level'],
    overallPercent: Number(row.overallPercent),
    stations: (row.stations as KitchenSnapshotDto['stations']) ?? [],
    delayedOrderIds: (row.delayedOrderIds as string[]) ?? [],
    updatedAt: new Date(row.updatedAt as string | Date).toISOString(),
  };
}

export async function ensureKitchenSnapshot(): Promise<void> {
  const existing = await KitchenModel.findById(KITCHEN_ID).lean();
  if (!existing) {
    await KitchenModel.create({
      _id: KITCHEN_ID,
      level: 'low',
      overallPercent: 0,
      stations: [],
      delayedOrderIds: [],
      updatedAt: new Date(),
    });
  }
}

export async function getKitchen(): Promise<KitchenSnapshotDto> {
  await ensureKitchenSnapshot();
  const row = await KitchenModel.findById(KITCHEN_ID).lean();
  return toDto(row as Record<string, unknown>);
}

export async function saveKitchen(snapshot: KitchenSnapshotDto): Promise<void> {
  await KitchenModel.findByIdAndUpdate(
    KITCHEN_ID,
    {
      level: snapshot.level,
      overallPercent: snapshot.overallPercent,
      stations: snapshot.stations,
      delayedOrderIds: snapshot.delayedOrderIds,
      updatedAt: new Date(snapshot.updatedAt),
    },
    { upsert: true },
  );
}
