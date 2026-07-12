export type Role = 'cashier' | 'kitchen' | 'manager' | 'support';
export type OrderChannel = 'walk-in' | 'delivery' | 'online';
export type OrderStatus = 'received' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled';
export type OrderPriority = 'normal' | 'high' | 'urgent';
export type KitchenLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface OrderItemDto {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  subtotal?: number;
  notes?: string;
  allergens?: string[];
}

export interface OrderTimelineEventDto {
  id: string;
  status?: OrderStatus;
  action: string;
  description?: string;
  actor: 'system' | 'cashier' | 'kitchen' | 'manager' | 'customer';
  createdAt: string;
}

export interface OrderDto {
  id: string;
  number: string;
  channel: OrderChannel;
  status: OrderStatus;
  priority: OrderPriority;
  customerName: string;
  tableNumber?: string;
  deliveryAddress?: string;
  items: OrderItemDto[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  timeline: OrderTimelineEventDto[];
  estimatedMinutes: number;
  isDelayed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDto {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  tags: string[];
  available: boolean;
  inventoryStock?: number;
  lowStockThreshold?: number;
}

export interface KitchenStationDto {
  id: string;
  name: string;
  activeTickets: number;
  capacity: number;
  loadPercent: number;
}

export interface KitchenSnapshotDto {
  level: KitchenLevel;
  overallPercent: number;
  stations: KitchenStationDto[];
  delayedOrderIds: string[];
  updatedAt: string;
}

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  createdAt: string;
}

export type ServerEvent =
  | { type: 'order.created'; payload: OrderDto; at: string }
  | { type: 'order.updated'; payload: OrderDto; at: string }
  | { type: 'order.deleted'; payload: { id: string }; at: string }
  | { type: 'order.status'; payload: { orderId: string; status: OrderStatus; source: string }; at: string }
  | { type: 'kitchen.updated'; payload: KitchenSnapshotDto; at: string }
  | { type: 'notification.created'; payload: NotificationDto; at: string }
  | { type: 'ai.started'; payload: { orderId: string }; at: string }
  | { type: 'ai.streaming'; payload: { orderId: string; text: string }; at: string }
  | { type: 'ai.completed'; payload: { orderId: string; suggestions: unknown[] }; at: string }
  | { type: 'connection'; payload: { online: boolean; reason: string }; at: string };
