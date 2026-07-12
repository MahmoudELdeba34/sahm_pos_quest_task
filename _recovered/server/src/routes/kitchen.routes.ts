import { Router } from 'express';
import { getKitchenController, updateKitchenController } from '../controllers/kitchen.controller.js';
import { optionalAuth, requirePermission } from '../middleware/auth.js';
import type { EventBus } from '../socket/event-bus.js';

export function kitchenRoutes(bus: EventBus): Router {
  const router = Router();
  router.get('/', optionalAuth, requirePermission('kitchen:read'), getKitchenController);
  router.put('/', optionalAuth, requirePermission('kitchen:write'), updateKitchenController(bus));
  router.patch('/', optionalAuth, requirePermission('kitchen:write'), updateKitchenController(bus));
  return router;
}
