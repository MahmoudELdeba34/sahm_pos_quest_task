export type NotificationType =
  | 'order_new'
  | 'order_delayed'
  | 'order_completed'
  | 'kitchen_overload'
  | 'offline'
  | 'online'
  | 'inventory_low'
  | 'system';

export interface AppNotification {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly isRead: boolean;
  readonly createdAt: string;
  readonly orderId?: string;
}
