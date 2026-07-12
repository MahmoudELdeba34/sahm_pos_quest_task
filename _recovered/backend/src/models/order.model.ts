import { v4 as uuid } from 'uuid';
import mongoose, { Schema } from 'mongoose';
import type { OrderDto, OrderStatus } from './domain.js';

const orderItemSchema = new Schema(
  {
    id: { type: String, default: () => uuid() },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    notes: { type: String },
    allergens: { type: [String], default: [] },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    _id: { type: String, default: () => uuid() },
    number: { type: String, required: true },
    channel: { type: String, required: true, enum: ['walk-in', 'delivery', 'online'] },
    status: {
      type: String,
      required: true,
      enum: ['received', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'],
    },
    priority: { type: String, required: true, enum: ['normal', 'high', 'urgent'] },
    customerName: { type: String, required: true },
    tableNumber: { type: String },
    deliveryAddress: { type: String },
    items: { type: [orderItemSchema], default: [] },
    total: { type: Number, required: true },
    estimatedMinutes: { type: Number, required: true },
    isDelayed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const OrderModel = mongoose.models.Order || mongoose.model('Order', orderSchema);

function toOrderDto(doc: Record<string, unknown>): OrderDto {
  const items = (doc.items as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    id: String(doc._id),
    number: String(doc.number),
    channel: doc.channel as OrderDto['channel'],
    status: doc.status as OrderDto['status'],
    priority: doc.priority as OrderDto['priority'],
    customerName: String(doc.customerName),
    tableNumber: doc.tableNumber ? String(doc.tableNumber) : undefined,
    deliveryAddress: doc.deliveryAddress ? String(doc.deliveryAddress) : undefined,
    items: items.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      notes: item.notes ? String(item.notes) : undefined,
      allergens: (item.allergens as string[] | undefined) ?? [],
    })),
    total: Number(doc.total),
    estimatedMinutes: Number(doc.estimatedMinutes),
    isDelayed: Boolean(doc.isDelayed),
    createdAt: new Date(doc.createdAt as string | Date).toISOString(),
    updatedAt: new Date(doc.updatedAt as string | Date).toISOString(),
  };
}

export async function listOrders(filters?: { status?: string; channel?: string }): Promise<OrderDto[]> {
  const query: Record<string, string> = {};
  if (filters?.status) query.status = filters.status;
  if (filters?.channel) query.channel = filters.channel;
  const rows = await OrderModel.find(query).sort({ updatedAt: -1 }).lean();
  return rows.map((row) => toOrderDto(row as Record<string, unknown>));
}

export async function getOrder(id: string): Promise<OrderDto | null> {
  const row = await OrderModel.findById(id).lean();
  return row ? toOrderDto(row as Record<string, unknown>) : null;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<OrderDto | null> {
  const updated = await OrderModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
  return updated ? toOrderDto(updated as Record<string, unknown>) : null;
}

export async function markOrdersDelayed(ids: string[]): Promise<OrderDto[]> {
  const updated: OrderDto[] = [];
  for (const id of ids) {
    const current = await getOrder(id);
    if (!current || current.isDelayed) continue;
    const priority = current.priority === 'normal' ? 'high' : 'urgent';
    const row = await OrderModel.findByIdAndUpdate(
      id,
      { isDelayed: true, priority },
      { new: true },
    ).lean();
    if (row) updated.push(toOrderDto(row as Record<string, unknown>));
  }
  return updated;
}

export async function createIncomingOrder(): Promise<OrderDto> {
  const channels = ['walk-in', 'delivery', 'online'] as const;
  const channel = channels[Math.floor(Math.random() * channels.length)];
  return createOrder({
    channel,
    status: 'received',
    priority: Math.random() > 0.7 ? 'high' : 'normal',
    customerName: ['Youssef Ali', 'Mona Saeed', 'Karim Adel', 'Hana Tarek'][Math.floor(Math.random() * 4)],
    tableNumber: channel === 'walk-in' ? String(1 + Math.floor(Math.random() * 20)) : undefined,
    deliveryAddress: channel === 'delivery' ? 'Nasr City delivery zone' : undefined,
    estimatedMinutes: 12 + Math.floor(Math.random() * 20),
    items: [
      {
        name: ['Chicken Plate', 'Burger Combo', 'Pasta Bowl'][Math.floor(Math.random() * 3)],
        quantity: 1 + Math.floor(Math.random() * 2),
        unitPrice: 40 + Math.floor(Math.random() * 160),
      },
    ],
  });
}

export async function createOrder(input: {
  channel: OrderDto['channel'];
  status?: OrderStatus;
  priority?: OrderDto['priority'];
  customerName: string;
  tableNumber?: string;
  deliveryAddress?: string;
  estimatedMinutes?: number;
  isDelayed?: boolean;
  number?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    allergens?: string[];
  }>;
}): Promise<OrderDto> {
  const channel = input.channel;
  const number =
    input.number ??
    `${channel === 'walk-in' ? 'A' : channel === 'delivery' ? 'D' : 'O'}-${Math.floor(1000 + Math.random() * 9000)}`;
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const created = await OrderModel.create({
    number,
    channel,
    status: input.status ?? 'received',
    priority: input.priority ?? 'normal',
    customerName: input.customerName,
    tableNumber: input.tableNumber,
    deliveryAddress: input.deliveryAddress,
    estimatedMinutes: input.estimatedMinutes ?? 15,
    isDelayed: input.isDelayed ?? false,
    total,
    items: input.items.map((item) => ({
      id: uuid(),
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
      allergens: item.allergens ?? [],
    })),
  });

  return toOrderDto(created.toObject() as Record<string, unknown>);
}

export async function deleteOrder(id: string): Promise<boolean> {
  const result = await OrderModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = ['received', 'preparing', 'ready', 'delivered', 'completed'];
