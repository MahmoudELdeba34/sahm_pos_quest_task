import { Router } from 'express';
import {
  createNotificationController,
  deleteNotificationController,
  listNotificationsController,
  markNotificationReadController,
} from '../controllers/notifications.controller.js';
import { optionalAuth, requirePermission } from '../middleware/auth.js';
import type { EventBus } from '../socket/event-bus.js';

export function notificationsRoutes(bus: EventBus): Router {
  const router = Router();
  router.get('/', optionalAuth, requirePermission('notifications:read'), listNotificationsController);
  router.post('/', optionalAuth, requirePermission('notifications:write'), createNotificationController(bus));
  router.patch('/:id/read', optionalAuth, requirePermission('notifications:read'), markNotificationReadController);
  router.delete('/:id', optionalAuth, requirePermission('notifications:write'), deleteNotificationController);
  return router;
}
