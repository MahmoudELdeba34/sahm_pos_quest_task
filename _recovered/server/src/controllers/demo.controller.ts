import type { Request, Response } from 'express';
import { getKitchen } from '../models/kitchen.model.js';
import { listNotifications } from '../models/notification.model.js';
import { listOrders } from '../models/order.model.js';
import { listCategories } from '../models/product.model.js';

export function demoBootstrapController(_req: Request, res: Response): void {
  res.json({
    orders: listOrders(),
    kitchen: getKitchen(),
    categories: listCategories(),
    notifications: listNotifications(),
  });
}
