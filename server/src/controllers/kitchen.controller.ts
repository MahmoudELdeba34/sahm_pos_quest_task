import type { Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../middleware/auth.js';
import { getKitchen, saveKitchen } from '../models/kitchen.model.js';
import type { EventBus } from '../socket/event-bus.js';

const kitchenSchema = z.object({
  level: z.enum(['low', 'medium', 'high', 'critical']),
  overallPercent: z.number().min(0).max(100),
  stations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      activeTickets: z.number().int().nonnegative(),
      capacity: z.number().int().positive(),
      loadPercent: z.number().min(0).max(100),
    }),
  ),
  delayedOrderIds: z.array(z.string()).optional(),
});

export function getKitchenController(_req: AuthedRequest, res: Response): void {
  res.json({ data: getKitchen() });
}

export function updateKitchenController(bus: EventBus) {
  return (req: AuthedRequest, res: Response): void => {
    const body = kitchenSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ message: 'Invalid kitchen payload', issues: body.error.issues });
      return;
    }
    const snapshot = {
      ...body.data,
      delayedOrderIds: body.data.delayedOrderIds ?? [],
      updatedAt: new Date().toISOString(),
    };
    saveKitchen(snapshot);
    bus.publish({ type: 'kitchen.updated', payload: snapshot, at: snapshot.updatedAt });
    res.json({ data: snapshot });
  };
}
