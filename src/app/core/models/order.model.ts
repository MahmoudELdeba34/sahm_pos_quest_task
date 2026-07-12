export type OrderChannel = 'walk-in' | 'delivery' | 'online';

export type OrderStatus =
  | 'received'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type OrderPriority = 'normal' | 'high' | 'urgent';

export interface OrderItem {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly notes?: string;
  readonly allergens?: readonly string[];
  readonly discount?: number;
  readonly tax?: number;
  readonly subtotal?: number;
}

export interface OrderTimelineEvent {
  readonly id: string;
  readonly status?: OrderStatus;
  readonly action: string;
  readonly description?: string;
  readonly at: string;
  readonly actor: 'system' | 'cashier' | 'kitchen' | 'manager' | 'customer';
}

export interface Order {
  readonly id: string;
  readonly number: string;
  readonly channel: OrderChannel;
  readonly status: OrderStatus;
  readonly priority: OrderPriority;
  readonly customerName: string;
  readonly items: readonly OrderItem[];
  readonly subtotal: number;
  readonly tax: number;
  readonly discount: number;
  readonly total: number;
  readonly timeline: readonly OrderTimelineEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly estimatedMinutes: number;
  readonly isDelayed: boolean;
  readonly tableNumber?: string;
  readonly deliveryAddress?: string;
}

export interface OrderStatusEvent {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly at: string;
  readonly source: 'websocket' | 'polling' | 'optimistic' | 'manual';
}

export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  'received',
  'preparing',
  'ready',
  'delivered',
  'completed',
] as const;

export function nextOrderStatus(current: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(current);
  if (index < 0 || index >= ORDER_STATUS_FLOW.length - 1) {
    return null;
  }
  return ORDER_STATUS_FLOW[index + 1];
}
