import { Router } from 'express';
import { createIncomingOrder } from '../services/data.service.js';
import type { EventBus } from '../socket/event-bus.js';

export function devRoutes(bus: EventBus): Router {
  const router = Router();

  router.post('/generate-orders', (req, res) => {
    const count = Number(req.query.count) || 1;
    for (let i = 0; i < count; i++) {
      const order = createIncomingOrder();
      bus.publish({ type: 'order.created', payload: order, at: new Date().toISOString() });
    }
    res.json({ message: `Generated ${count} orders.` });
  });

  router.post('/kitchen-rush', (req, res) => {
    // This will be handled in simulation.ts or data.service.ts
    // For now we just return ok, we'll implement the actual logic in simulation.ts later
    res.json({ message: 'Kitchen rush simulated.' });
  });

  return router;
}
