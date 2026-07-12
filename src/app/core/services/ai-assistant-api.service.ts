import { Injectable, inject } from '@angular/core';
import { Observable, defer, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AiSuggestion, AiSuggestionType } from '../models/ai-assistant.model';
import { Order } from '../models/order.model';
import { KitchenLoadSnapshot } from '../models/kitchen.model';
import { IdGeneratorService } from '../utils/id-generator.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { concat, of, delay } from 'rxjs';

export interface AiStreamChunk {
  readonly kind: 'token' | 'suggestion' | 'done';
  readonly text?: string;
  readonly suggestion?: AiSuggestion;
}

export interface AiRequestOptions {
  readonly failFirstAttempts?: number;
  readonly order: Order;
  readonly kitchen?: KitchenLoadSnapshot | null;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantApiService {
  private readonly ids = inject(IdGeneratorService);
  private readonly auth = inject(AuthService);
  private attemptByOrder = new Map<string, number>();

  streamRecommendations(options: AiRequestOptions): Observable<AiStreamChunk> {
    if (environment.useRemoteBackend) {
      return this.streamFromServer(options);
    }
    return this.streamLocal(options);
  }

  resetAttempts(orderId: string): void {
    this.attemptByOrder.delete(orderId);
  }

  private streamFromServer(options: AiRequestOptions): Observable<AiStreamChunk> {
    const orderId = options.order.id;
    const attempt = (this.attemptByOrder.get(orderId) ?? 0) + 1;
    this.attemptByOrder.set(orderId, attempt);
    const failFirst = (options.failFirstAttempts ?? 1) > 0 && attempt === 1;

    return new Observable<AiStreamChunk>((subscriber) => {
      const controller = new AbortController();
      const token = this.auth.accessToken();

      fetch(`${environment.apiBaseUrl}/ai/recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId, failFirst }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok || !response.body) {
            throw new Error(`AI HTTP ${response.status}`);
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let sawDone = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() ?? '';
            for (const part of parts) {
              const line = part
                .split('\n')
                .map((l) => l.trim())
                .find((l) => l.startsWith('data:'));
              if (!line) continue;
              const payload = JSON.parse(line.replace(/^data:\s*/, '')) as {
                kind: string;
                text?: string;
                message?: string;
                suggestion?: AiSuggestion;
              };
              if (payload.kind === 'error') {
                throw new Error(payload.message ?? 'AI stream error');
              }
              if (payload.kind === 'token') {
                subscriber.next({ kind: 'token', text: payload.text ?? '' });
              } else if (payload.kind === 'suggestion' && payload.suggestion) {
                subscriber.next({ kind: 'suggestion', suggestion: payload.suggestion });
              } else if (payload.kind === 'done') {
                sawDone = true;
                subscriber.next({ kind: 'done' });
              }
            }
          }
          if (!sawDone) {
            subscriber.next({ kind: 'done' });
          }
          subscriber.complete();
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            subscriber.complete();
            return;
          }
          subscriber.error(error instanceof Error ? error : new Error('AI stream failed'));
        });

      return () => controller.abort();
    });
  }

  private streamLocal(options: AiRequestOptions): Observable<AiStreamChunk> {
    const orderId = options.order.id;
    const attempt = (this.attemptByOrder.get(orderId) ?? 0) + 1;
    this.attemptByOrder.set(orderId, attempt);
    const shouldFail = attempt <= (options.failFirstAttempts ?? 1) && attempt === 1;

    return defer(() => {
      if (shouldFail) {
        return timer(900).pipe(switchMap(() => throwError(() => new Error('AI service temporarily unavailable'))));
      }
      return this.buildLocalStream(options.order, options.kitchen ?? null);
    });
  }

  private buildLocalStream(order: Order, kitchen: KitchenLoadSnapshot | null): Observable<AiStreamChunk> {
    const narrative = `Analyzing ${order.channel} order ${order.number} for ${order.customerName}.`;
    const suggestions = this.buildSuggestions(order, kitchen);
    const tokens = narrative.split(' ').map((word, index, arr) =>
      of<AiStreamChunk>({ kind: 'token', text: index === arr.length - 1 ? word : `${word} ` }).pipe(
        delay(80 + index * 35),
      ),
    );
    const suggestionChunks = suggestions.map((suggestion, index) =>
      of<AiStreamChunk>({ kind: 'suggestion', suggestion }).pipe(delay(120 + index * 180)),
    );
    return concat(...tokens, ...suggestionChunks, of<AiStreamChunk>({ kind: 'done' }));
  }

  private buildSuggestions(order: Order, kitchen: KitchenLoadSnapshot | null): AiSuggestion[] {
    const suggestions: AiSuggestion[] = [];
    const allergens = order.items.flatMap((item) => item.allergens ?? []);
    
    // 1. Allergy Scenario
    if (allergens.length) {
      suggestions.push(this.suggestion('allergy', 'Allergy Warning', `Verify ${[...new Set(allergens)].join(', ')} allergy with customer!`, 0.98));
    }
    
    // 2. VIP Scenario (New Business Rule)
    const isVip = order.customerName.toLowerCase().includes('vip') || order.customerName.toLowerCase() === 'john';
    if (isVip) {
      suggestions.push(this.suggestion('upsell', '🌟 VIP Detected', 'Lifetime value > $5k. Suggest complimentary dessert.', 0.95));
    }
    
    // 3. Kitchen Overload Scenario (New Business Rule)
    if (kitchen && (kitchen.level === 'high' || kitchen.level === 'critical')) {
      suggestions.push(this.suggestion('kitchen_overload', '⏳ Kitchen Overloaded', 'Load > 90%. Steer customer to pre-made salads instead of grilled items.', 0.92));
    }
    
    // 4. Default Upsell Scenario
    if (!suggestions.length) {
      suggestions.push(this.suggestion('upsell', 'Add a side', 'Offer fries or a drink.', 0.7));
    }
    return suggestions;
  }

  private suggestion(type: AiSuggestionType, title: string, message: string, confidence: number): AiSuggestion {
    return {
      id: this.ids.next('ai'),
      type,
      title,
      message,
      confidence,
      actionable: type === 'upsell',
    };
  }
}
