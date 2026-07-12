import { v4 as uuid } from 'uuid';
import type { KitchenSnapshotDto, OrderDto } from '../types/domain.js';
import type { EventBus } from '../socket/event-bus.js';

export interface AiChunk {
  kind: 'token' | 'suggestion' | 'error';
  text?: string;
  message?: string;
  suggestion?: {
    id: string;
    type: string;
    title: string;
    message: string;
    confidence: number;
    actionable: boolean;
  };
}

const attempts = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* streamAiRecommendation(
  order: OrderDto,
  kitchen: KitchenSnapshotDto,
  failFirst: boolean,
  bus: EventBus,
): AsyncGenerator<AiChunk> {
  const attempt = (attempts.get(order.id) ?? 0) + 1;
  attempts.set(order.id, attempt);

  bus.publish({ type: 'ai.started', payload: { orderId: order.id }, at: new Date().toISOString() });

  if (failFirst && attempt === 1) {
    await sleep(700);
    throw new Error('AI service temporarily unavailable');
  }

  const narrative = `Analyzing ${order.channel} order ${order.number} for ${order.customerName}. Kitchen is ${kitchen.level} at ${kitchen.overallPercent}%.`;
  let partial = '';
  for (const word of narrative.split(' ')) {
    const token = `${word} `;
    partial += token;
    bus.publish({
      type: 'ai.streaming',
      payload: { orderId: order.id, text: partial },
      at: new Date().toISOString(),
    });
    yield { kind: 'token', text: token };
    await sleep(45);
  }

  const suggestions: AiChunk['suggestion'][] = [];
  const allergens = order.items.flatMap((i) => i.allergens ?? []);
  if (allergens.length) {
    suggestions.push({
      id: uuid(),
      type: 'allergy',
      title: 'Allergy warning',
      message: `Contains: ${[...new Set(allergens)].join(', ')}`,
      confidence: 0.94,
      actionable: false,
    });
  }
  if (order.channel === 'delivery' && order.estimatedMinutes > 25) {
    suggestions.push({
      id: uuid(),
      type: 'delivery_risk',
      title: 'Delivery SLA risk',
      message: 'ETA exceeds target. Consider priority prep.',
      confidence: 0.86,
      actionable: true,
    });
  }
  if (kitchen.level === 'high' || kitchen.level === 'critical') {
    suggestions.push({
      id: uuid(),
      type: 'kitchen_overload',
      title: 'Kitchen overload',
      message: 'Delay non-urgent tickets and fire ready items first.',
      confidence: 0.88,
      actionable: true,
    });
  }
  if (!order.items.some((i) => /tea|cola|lemonade|drink/i.test(i.name))) {
    suggestions.push({
      id: uuid(),
      type: 'upsell',
      title: 'Upsell opportunity',
      message: 'Suggest a drink combo to lift basket size.',
      confidence: 0.77,
      actionable: true,
    });
  }
  if (!suggestions.length) {
    suggestions.push({
      id: uuid(),
      type: 'upsell',
      title: 'Add a side',
      message: 'Offer fries or salad for average ticket growth.',
      confidence: 0.7,
      actionable: true,
    });
  }

  for (const suggestion of suggestions) {
    yield { kind: 'suggestion', suggestion };
    await sleep(120);
  }

  bus.publish({
    type: 'ai.completed',
    payload: { orderId: order.id, suggestions },
    at: new Date().toISOString(),
  });
}
