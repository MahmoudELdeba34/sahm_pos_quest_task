import { v4 as uuid } from 'uuid';
import mongoose, { Schema } from 'mongoose';
import type { NotificationDto } from './domain.js';

const notificationSchema = new Schema(
  {
    _id: { type: String, default: () => uuid() },
    title: { type: String, required: true },
    body: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const NotificationModel =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

function toDto(row: Record<string, unknown>): NotificationDto {
  return {
    id: String(row._id),
    title: String(row.title),
    body: String(row.body),
    severity: row.severity as NotificationDto['severity'],
    read: Boolean(row.read),
    createdAt: new Date(row.createdAt as string | Date).toISOString(),
  };
}

export async function listNotifications(): Promise<NotificationDto[]> {
  const rows = await NotificationModel.find().sort({ createdAt: -1 }).limit(50).lean();
  return rows.map((row) => toDto(row as Record<string, unknown>));
}

export async function createNotification(input: {
  title: string;
  body: string;
  severity?: NotificationDto['severity'];
}): Promise<NotificationDto> {
  const created = await NotificationModel.create({
    title: input.title,
    body: input.body,
    severity: input.severity ?? 'info',
    read: false,
  });
  return toDto(created.toObject() as Record<string, unknown>);
}

export async function markNotificationRead(id: string, read = true): Promise<NotificationDto | null> {
  const updated = await NotificationModel.findByIdAndUpdate(id, { read }, { new: true }).lean();
  return updated ? toDto(updated as Record<string, unknown>) : null;
}

export async function deleteNotification(id: string): Promise<boolean> {
  const result = await NotificationModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}
