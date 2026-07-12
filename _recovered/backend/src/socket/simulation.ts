import { getKitchen, saveKitchen } from '../models/kitchen.model.js';
import {
  createIncomingOrder,
  listOrders,
  markOrdersDelayed,
  updateOrderStatus,
} from '../models/order.model.js';
import type { KitchenLevel, OrderStatus } from '../models/domain.js';
import type { EventBus } from '../socket/event-bus.js';

const FLOW: OrderStatus[] = ['received', 'preparing', 'ready', 'delivered', 'completed'];

function toLevel(percent: number): KitchenLevel {
  if (percent >= 85) return 'critical';
  if (percent >= 70) return 'high';
  if (percent >= 40) return 'medium';
  return 'low';
}

export function startSimulation(bus: EventBus): () => void {
  let kitchenPercent = 55;

  void getKitchen().then((k) => {
    kitchenPercent = k.overallPercent || 55;
  });

  const orderTimer = setInterval(() => {
    void (async () => {
      const roll = Math.random();
      const at = new Date().toISOString();
      if (roll < 0.35) {
        const order = await createIncomingOrder();
        bus.publish({ type: 'order.created', payload: order, at });
        return;
      }
      if (roll < 0.85) {
        const active = (await listOrders()).filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
        if (!active.length) return;
        const order = active[Math.floor(Math.random() * active.length)];
        const index = FLOW.indexOf(order.status);
        if (index < 0 || index >= FLOW.length - 1) return;
        const updated = await updateOrderStatus(order.id, FLOW[index + 1]);
        if (!updated) return;
        bus.publish({
          type: 'order.status',
          payload: { orderId: updated.id, status: updated.status, source: 'websocket' },
          at,
        });
        bus.publish({ type: 'order.updated', payload: updated, at });
      }
    })();
  }, 3200);

  const kitchenTimer = setInterval(() => {
    void (async () => {
      kitchenPercent = Math.max(15, Math.min(98, kitchenPercent + Math.floor(Math.random() * 21) - 8));
      const level = toLevel(kitchenPercent);
      const stations = [
        { id: 'grill', name: 'Grill', capacity: 12 },
        { id: 'fry', name: 'Fryer', capacity: 10 },
        { id: 'cold', name: 'Cold Prep', capacity: 8 },
        { id: 'dessert', name: 'Dessert', capacity: 6 },
      ].map((station, index) => {
        const loadPercent = Math.max(10, Math.min(100, kitchenPercent + ((index * 13) % 17) - 8));
        return {
          ...station,
          activeTickets: Math.round((loadPercent / 100) * station.capacity),
          loadPercent,
        };
      });
      const active = (await listOrders())
        .filter((o) => o.status === 'preparing' || o.status === 'received')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const delayedCount = level === 'critical' ? 3 : level === 'high' ? 2 : level === 'medium' ? 1 : 0;
      const delayedOrderIds = active.slice(0, delayedCount).map((o) => o.id);
      const snapshot = {
        level,
        overallPercent: kitchenPercent,
        stations,
        delayedOrderIds,
        updatedAt: new Date().toISOString(),
      };
      await saveKitchen(snapshot);
      const updatedOrders = await markOrdersDelayed(delayedOrderIds);
      bus.publish({ type: 'kitchen.updated', payload: snapshot, at: snapshot.updatedAt });
      for (const order of updatedOrders) {
        bus.publish({ type: 'order.updated', payload: order, at: snapshot.updatedAt });
      }
    })();
  }, 4500);

  return () => {
    clearInterval(orderTimer);
    clearInterval(kitchenTimer);
  };
}
