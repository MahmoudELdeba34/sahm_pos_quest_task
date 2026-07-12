import type { Request, Response } from 'express';
import { z } from 'zod';
import { login, refresh, register } from '../services/auth.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().trim().min(2).max(80),
  role: z.enum(['cashier', 'kitchen', 'manager', 'support']),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export async function loginController(req: Request, res: Response): Promise<void> {
  const body = loginSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'Invalid credentials payload', issues: body.error.issues });
    return;
  }
  const result = await login(body.data.email, body.data.password);
  if (!result) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }
  res.json(result);
}

export async function registerController(req: Request, res: Response): Promise<void> {
  const body = registerSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'Invalid register payload', issues: body.error.issues });
    return;
  }
  const result = await register(body.data);
  if ('error' in result) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }
  res.status(201).json(result);
}

export function refreshController(req: Request, res: Response): void {
  const body = refreshSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'refreshToken required' });
    return;
  }
  const result = refresh(body.data.refreshToken);
  if (!result) {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }
  res.json(result);
}
