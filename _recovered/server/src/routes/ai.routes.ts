import { Router } from 'express';
import { aiRecommendationController } from '../controllers/ai.controller.js';
import { optionalAuth, requirePermission } from '../middleware/auth.js';
import type { EventBus } from '../socket/event-bus.js';

export function aiRoutes(bus: EventBus): Router {
  const router = Router();
  router.post('/recommendation', optionalAuth, requirePermission('ai:read'), aiRecommendationController(bus));
  return router;
}
