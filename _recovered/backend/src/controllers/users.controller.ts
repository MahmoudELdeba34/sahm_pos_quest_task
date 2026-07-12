import type { Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../middleware/auth.js';
import { deleteUser, getUser, listUsers, updateUser } from '../models/user.model.js';

export async function listUsersController(_req: AuthedRequest, res: Response): Promise<void> {
  res.json({ data: await listUsers() });
}

export async function getUserController(req: AuthedRequest, res: Response): Promise<void> {
  const user = await getUser(req.params.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json({ data: user });
}

export async function updateUserController(req: AuthedRequest, res: Response): Promise<void> {
  const body = z
    .object({
      name: z.string().trim().min(2).optional(),
      email: z.string().email().optional(),
      role: z.enum(['cashier', 'kitchen', 'manager', 'support']).optional(),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'Invalid user payload', issues: body.error.issues });
    return;
  }
  try {
    const updated = await updateUser(req.params.id, body.data);
    if (!updated) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ data: updated });
  } catch {
    res.status(409).json({ message: 'Email already in use' });
  }
}

export async function deleteUserController(req: AuthedRequest, res: Response): Promise<void> {
  if (!(await deleteUser(req.params.id))) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.status(204).send();
}
