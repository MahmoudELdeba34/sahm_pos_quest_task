import type { Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../middleware/auth.js';
import { getKitchen } from '../models/kitchen.model.js';
import { getOrder } from '../models/order.model.js';
import { streamAiRecommendation } from '../services/ai.service.js';
import type { EventBus } from '../socket/event-bus.js';

const bodySchema = z.object({
  orderId: z.string().min(1),
  failFirst: z.boolean().optional(),
});

export function aiRecommendationController(bus: EventBus) {
  return async (req: AuthedRequest, res: Response): Promise<void> => {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ message: 'orderId required' });
      return;
    }
    const order = await getOrder(body.data.orderId);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const kitchen = await getKitchen();
      for await (const chunk of streamAiRecommendation(order, kitchen, body.data.failFirst ?? true, bus)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: {"kind":"done"}\n\n');
      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI failed';
      res.write(`data: ${JSON.stringify({ kind: 'error', message })}\n\n`);
      res.end();
    }
  };
}
