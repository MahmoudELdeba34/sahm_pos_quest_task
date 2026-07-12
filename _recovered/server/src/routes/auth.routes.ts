import { Router } from 'express';
import { loginController, refreshController, registerController } from '../controllers/auth.controller.js';

export function authRoutes(): Router {
  const router = Router();
  router.post('/login', loginController);
  router.post('/register', registerController);
  router.post('/auth/refresh', refreshController);
  return router;
}
