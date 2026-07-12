import { Injectable, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import {
  Subject,
  Subscription,
  catchError,
  of,
  retry,
  takeUntil,
  tap,
} from 'rxjs';
import { AiAssistantState, AiSuggestion } from '../../core/models/ai-assistant.model';
import { AiAssistantApiService, AiStreamChunk } from '../../core/services/ai-assistant-api.service';
import { OrdersStore } from '../orders/orders.store';
import { KitchenStore } from '../kitchen/kitchen.store';
import { OfflineQueueService } from '../../core/services/offline-queue.service';
import { ConnectivityService } from '../../core/services/connectivity.service';

const INITIAL: AiAssistantState = {
  orderId: null,
  status: 'idle',
  partialText: '',
  suggestions: [],
  error: null,
  attempt: 0,
  lastUpdatedAt: null,
};

@Injectable({ providedIn: 'root' })
export class AiAssistantStore implements OnDestroy {
  private readonly api = inject(AiAssistantApiService);
  private readonly ordersStore = inject(OrdersStore);
  private readonly kitchenStore = inject(KitchenStore);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly destroy$ = new Subject<void>();
  private readonly cancel$ = new Subject<void>();
  private streamSub?: Subscription;

  private readonly stateSignal = signal<AiAssistantState>(INITIAL);

  readonly state = this.stateSignal.asReadonly();
  readonly status = computed(() => this.stateSignal().status);
  readonly suggestions = computed(() => this.stateSignal().suggestions);
  readonly partialText = computed(() => this.stateSignal().partialText);
  readonly error = computed(() => this.stateSignal().error);
  readonly isBusy = computed(() => {
    const status = this.stateSignal().status;
    return status === 'loading' || status === 'streaming' || status === 'retrying';
  });

  constructor() {
    effect(() => {
      const order = this.ordersStore.selectedOrder();
      const orderId = order?.id ?? null;
      if (orderId && orderId !== this.stateSignal().orderId) {
        this.loadForOrder(orderId);
      }
      if (!orderId) {
        this.stateSignal.set(INITIAL);
      }
    });
  }

  ngOnDestroy(): void {
    this.cancel$.next();
    this.destroy$.next();
    this.destroy$.complete();
    this.streamSub?.unsubscribe();
  }

  refresh(): void {
    const order = this.ordersStore.selectedOrder();
    if (!order) {
      return;
    }
    this.api.resetAttempts(order.id);
    this.loadForOrder(order.id, true);
  }

  private loadForOrder(orderId: string, force = false): void {
    const order = this.ordersStore.orders().find((o) => o.id === orderId) ?? this.ordersStore.selectedOrder();
    if (!order) {
      return;
    }

    if (!this.connectivity.online()) {
      this.offlineQueue.enqueue(
        'ai.request.refresh',
        { orderId },
        `ai-refresh:${orderId}:${Date.now()}`,
      );
      this.stateSignal.set({
        orderId,
        status: 'error',
        partialText: '',
        suggestions: [],
        error: 'AI assistant unavailable offline. Request queued for retry.',
        attempt: 0,
        lastUpdatedAt: new Date().toISOString(),
      });
      return;
    }

    this.cancel$.next();
    this.streamSub?.unsubscribe();

    this.stateSignal.set({
      orderId,
      status: 'loading',
      partialText: '',
      suggestions: [],
      error: null,
      attempt: 1,
      lastUpdatedAt: new Date().toISOString(),
    });

    this.streamSub = this.api
      .streamRecommendations({
        order,
        kitchen: this.kitchenStore.snapshot(),
        failFirstAttempts: force ? 0 : 1,
      })
      .pipe(
        tap({
          next: (chunk) => {
            if (chunk.kind === 'token' && this.stateSignal().status === 'retrying') {
              this.patch({ status: 'streaming', error: null });
            }
          },
          error: () => {
            this.patch({ status: 'retrying', error: 'Retrying AI request…', attempt: this.stateSignal().attempt + 1 });
          },
        }),
        retry({
          count: 2,
          delay: 600,
        }),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'AI request failed';
          this.patch({
            status: 'error',
            error: message,
            lastUpdatedAt: new Date().toISOString(),
          });
          return of<AiStreamChunk | null>(null);
        }),
        takeUntil(this.cancel$),
        takeUntil(this.destroy$),
      )
      .subscribe((chunk) => {
        if (!chunk) {
          return;
        }
        if (chunk.kind === 'token') {
          this.stateSignal.update((state) => ({
            ...state,
            status: 'streaming',
            partialText: state.partialText + (chunk.text ?? ''),
            error: null,
          }));
          return;
        }
        if (chunk.kind === 'suggestion' && chunk.suggestion) {
          this.stateSignal.update((state) => ({
            ...state,
            suggestions: [...state.suggestions, chunk.suggestion as AiSuggestion],
          }));
          return;
        }
        if (chunk.kind === 'done') {
          this.patch({
            status: 'success',
            error: null,
            lastUpdatedAt: new Date().toISOString(),
          });
        }
      });
  }

  private patch(patch: Partial<AiAssistantState>): void {
    this.stateSignal.update((state) => ({ ...state, ...patch }));
  }
}
