import { Router } from 'express';
import type { EventBus } from '../socket/event-bus.js';
import { aiRoutes } from './ai.routes.js';
import { authRoutes } from './auth.routes.js';
import { healthRoutes } from './health.routes.js';
import { kitchenRoutes } from './kitchen.routes.js';
import { notificationsRoutes } from './notifications.routes.js';
import { ordersRoutes } from './orders.routes.js';
import { categoriesRoutes, productsRoutes } from './products.routes.js';
import { usersRoutes } from './users.routes.js';
import { devRoutes } from './dev.routes.js';

/** Mounts REST modules under `/api`. No demo bootstrap — clients use real endpoints. */
export function buildApiRouter(bus: EventBus): Router {
  const router = Router();

  router.use(healthRoutes());
  router.use(authRoutes());
  router.use('/users', usersRoutes());
  router.use('/orders', ordersRoutes(bus));
  router.use('/products', productsRoutes());
  router.use('/categories', categoriesRoutes());
  router.use('/kitchen', kitchenRoutes(bus));
  router.use('/notifications', notificationsRoutes(bus));
  router.use('/ai', aiRoutes(bus));
  router.use('/dev', devRoutes(bus));

  return router;
}
