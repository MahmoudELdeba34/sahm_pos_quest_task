import { Order, OrderStatusEvent } from './order.model';
import { KitchenLoadSnapshot } from './kitchen.model';
import { AppNotification } from '../infrastructure/gourmet-api.client';

export type RealtimeEventType =
  | 'order.created'
  | 'order.updated'
  | 'order.deleted'
  | 'order.status'
  | 'kitchen.load'
  | 'notification.created'
  | 'connection';

export interface RealtimeEnvelope<T = unknown> {
  readonly type: RealtimeEventType;
  readonly payload: T;
  readonly at: string;
}

export type OrderCreatedPayload = Order;
export type OrderUpdatedPayload = Order;
export type OrderStatusPayload = OrderStatusEvent;
export type KitchenLoadPayload = KitchenLoadSnapshot;
export type NotificationCreatedPayload = AppNotification;

export interface ConnectionPayload {
  readonly online: boolean;
  readonly reason: string;
}
