import type { Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../middleware/auth.js';
import {
  createNotification,
  deleteNotification,
  listNotifications,
  markNotificationRead,
} from '../models/notification.model.js';
import type { EventBus } from '../socket/event-bus.js';

export function listNotificationsController(_req: AuthedRequest, res: Response): void {
  res.json({ data: listNotifications() });
}

export function createNotificationController(bus: EventBus) {
  return (req: AuthedRequest, res: Response): void => {
    const body = z
      .object({
        title: z.string().min(1),
        body: z.string().min(1),
        severity: z.enum(['info', 'warning', 'critical']).optional(),
      })
      .safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ message: 'Invalid notification payload', issues: body.error.issues });
      return;
    }
    const created = createNotification(body.data);
    bus.publish({ type: 'notification.created', payload: created, at: created.createdAt });
    res.status(201).json({ data: created });
  };
}

export function markNotificationReadController(req: AuthedRequest, res: Response): void {
  const updated = markNotificationRead(req.params.id, true);
  if (!updated) {
    res.status(404).json({ message: 'Notification not found' });
    return;
  }
  res.json({ data: updated });
}

export function deleteNotificationController(req: AuthedRequest, res: Response): void {
  if (!deleteNotification(req.params.id)) {
    res.status(404).json({ message: 'Notification not found' });
    return;
  }
  res.status(204).send();
}
