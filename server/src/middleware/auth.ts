import type { NextFunction, Request, Response } from 'express';
import { ROLE_PERMISSIONS, verifyAccessToken } from '../services/auth.service.js';
import type { AuthUser, Role } from '../types/domain.js';

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    const user = verifyAccessToken(header.slice(7));
    if (user) req.user = user;
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing bearer token' });
    return;
  }
  const user = verifyAccessToken(header.slice(7));
  if (!user) {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }
  req.user = user;
  next();
}

export function requirePermission(permission: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const permissions = ROLE_PERMISSIONS[req.user.role as Role] ?? [];
    if (!permissions.includes(permission)) {
      res.status(403).json({ message: `Missing permission: ${permission}` });
      return;
    }
    next();
  };
}

/** Simulates flaky networks for demo / interview scenarios. */
export function chaosMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.header('x-force-error') === '500') {
    res.status(500).json({ message: 'Simulated upstream failure' });
    return;
  }
  const delayHeader = Number(req.header('x-simulate-delay-ms') ?? 0);
  const randomDelay = Math.random() < 0.12 ? 200 + Math.floor(Math.random() * 600) : 0;
  const delay = delayHeader || randomDelay;
  if (delay > 0) {
    setTimeout(next, delay);
    return;
  }
  next();
}
