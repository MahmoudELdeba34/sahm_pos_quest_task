import { Router } from 'express';
import { demoBootstrapController } from '../controllers/demo.controller.js';

export function demoRoutes(): Router {
  const router = Router();
  router.get('/bootstrap', demoBootstrapController);
  return router;
}
