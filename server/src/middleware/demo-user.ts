import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from './auth.js';

/** Local/demo mode: if no JWT, act as branch manager so UI works out of the box. */
export function ensureDemoUser(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    req.user = {
      id: 'demo-manager',
      email: 'manager@gourmetos.local',
      name: 'Maya Manager',
      role: 'manager',
    };
  }
  next();
}
