import { Router } from 'express';
import {
  deleteUserController,
  getUserController,
  listUsersController,
  updateUserController,
} from '../controllers/users.controller.js';
import { optionalAuth, requirePermission } from '../middleware/auth.js';

export function usersRoutes(): Router {
  const router = Router();
  router.get('/', optionalAuth, requirePermission('users:read'), listUsersController);
  router.get('/:id', optionalAuth, requirePermission('users:read'), getUserController);
  router.patch('/:id', optionalAuth, requirePermission('users:write'), updateUserController);
  router.delete('/:id', optionalAuth, requirePermission('users:write'), deleteUserController);
  return router;
}
