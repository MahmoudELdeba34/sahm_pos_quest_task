import { Router } from 'express';
import {
  advanceOrderController,
  createOrderController,
  deleteOrderController,
  getOrderController,
  listOrdersController,
  patchOrderController,
} from '../controllers/orders.controller.js';
import { optionalAuth, requirePermission } from '../middleware/auth.js';
import type { EventBus } from '../socket/event-bus.js';

export function ordersRoutes(bus: EventBus): Router {
  const router = Router();
  router.get('/', optionalAuth, requirePermission('orders:read'), listOrdersController);
  router.post('/', optionalAuth, requirePermission('orders:write'), createOrderController(bus));
  router.get('/:id', optionalAuth, requirePermission('orders:read'), getOrderController);
  router.patch('/:id', optionalAuth, requirePermission('orders:write'), patchOrderController(bus));
  router.delete('/:id', optionalAuth, requirePermission('orders:write'), deleteOrderController(bus));
  router.post('/:id/advance', optionalAuth, requirePermission('orders:write'), advanceOrderController(bus));
  return router;
}
