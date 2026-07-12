import type { Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../middleware/auth.js';
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  ORDER_STATUS_FLOW,
  updateOrderStatus,
} from '../models/order.model.js';
import type { EventBus } from '../socket/event-bus.js';

const patchSchema = z.object({
  status: z.enum(['received', 'preparing', 'ready', 'delivered', 'completed', 'cancelled']),
  idempotencyKey: z.string().optional(),
});

const createSchema = z.object({
  channel: z.enum(['walk-in', 'delivery', 'online']),
  status: z.enum(['received', 'preparing', 'ready', 'delivered', 'completed', 'cancelled']).optional(),
  priority: z.enum(['normal', 'high', 'urgent']).optional(),
  customerName: z.string().trim().min(2),
  tableNumber: z.string().optional(),
  deliveryAddress: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  isDelayed: z.boolean().optional(),
  number: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
        notes: z.string().optional(),
        allergens: z.array(z.string()).optional(),
      }),
    )
    .min(1),
});

export function listOrdersController(req: AuthedRequest, res: Response): void {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const channel = typeof req.query.channel === 'string' ? req.query.channel : undefined;
  res.json({ data: listOrders({ status, channel }) });
}

export function getOrderController(req: AuthedRequest, res: Response): void {
  const order = getOrder(req.params.id);
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  res.json({ data: order });
}

export function createOrderController(bus: EventBus) {
  return (req: AuthedRequest, res: Response): void => {
    const body = createSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ message: 'Invalid order payload', issues: body.error.issues });
      return;
    }
    const created = createOrder(body.data);
    const at = new Date().toISOString();
    bus.publish({ type: 'order.created', payload: created, at });
    res.status(201).json({ data: created });
  };
}

export function deleteOrderController(bus: EventBus) {
  return (req: AuthedRequest, res: Response): void => {
    const existing = getOrder(req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    deleteOrder(req.params.id);
    const at = new Date().toISOString();
    bus.publish({ type: 'order.deleted', payload: { id: req.params.id }, at });
    res.status(204).send();
  };
}

export function patchOrderController(bus: EventBus) {
  return (req: AuthedRequest, res: Response): void => {
    const body = patchSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ message: 'Invalid patch payload', issues: body.error.issues });
      return;
    }
    const updated = updateOrderStatus(req.params.id, body.data.status);
    if (!updated) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    const at = new Date().toISOString();
    bus.publish({ type: 'order.status', payload: { orderId: updated.id, status: updated.status, source: 'rest' }, at });
    bus.publish({ type: 'order.updated', payload: updated, at });
    res.json({ data: updated });
  };
}

export function advanceOrderController(bus: EventBus) {
  return (req: AuthedRequest, res: Response): void => {
    const current = getOrder(req.params.id);
    if (!current) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    const index = ORDER_STATUS_FLOW.indexOf(current.status);
    if (index < 0 || index >= ORDER_STATUS_FLOW.length - 1) {
      res.status(409).json({ message: 'Order cannot advance further', data: current });
      return;
    }
    const updated = updateOrderStatus(current.id, ORDER_STATUS_FLOW[index + 1]);
    if (!updated) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    const at = new Date().toISOString();
    bus.publish({ type: 'order.status', payload: { orderId: updated.id, status: updated.status, source: 'rest' }, at });
    bus.publish({ type: 'order.updated', payload: updated, at });
    res.json({ data: updated });
  };
}
