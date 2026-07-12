import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, concatMap, finalize, map, tap, toArray } from 'rxjs/operators';
import { OfflineAction, OfflineActionType } from '../models/offline.model';
import { ConnectivityService } from './connectivity.service';
import { IdGeneratorService } from '../utils/id-generator.service';
import { RealtimeGatewayService } from './realtime-gateway.service';
import { OrderStatus, OrderPriority } from '../models/order.model';
import { GourmetApiClient } from '../infrastructure/gourmet-api.client';

const STORAGE_KEY = 'sahm.pos.offline-queue';

/**
 * Queues optimistic user actions while offline and syncs on reconnect.
 * Uses idempotency keys to prevent duplicated operations.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private readonly connectivity = inject(ConnectivityService);
  private readonly ids = inject(IdGeneratorService);
  private readonly gateway = inject(RealtimeGatewayService);
  private readonly api = inject(GourmetApiClient);
  private readonly queueSignal = signal<OfflineAction[]>(this.load());
  private syncing = false;
  private readonly processedKeys = new Set<string>(
    this.queueSignal()
      .filter((a) => a.status === 'synced')
      .map((a) => a.idempotencyKey),
  );

  readonly actions = this.queueSignal.asReadonly();
  readonly pendingCount = computed(
    () => this.queueSignal().filter((a) => a.status === 'pending' || a.status === 'failed').length,
  );
  readonly isSyncing = computed(() => this.queueSignal().some((a) => a.status === 'syncing'));

  constructor() {
    this.connectivity.online$.subscribe((online) => {
      if (online) {
        this.syncPending().subscribe();
      }
    });
  }

  enqueue(
    type: OfflineActionType,
    payload: Readonly<Record<string, unknown>>,
    idempotencyKey: string,
  ): OfflineAction {
    if (this.processedKeys.has(idempotencyKey) || this.queueSignal().some((a) => a.idempotencyKey === idempotencyKey && a.status !== 'failed')) {
      const existing = this.queueSignal().find((a) => a.idempotencyKey === idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const action: OfflineAction = {
      id: this.ids.next('off'),
      type,
      payload,
      createdAt: new Date().toISOString(),
      status: this.connectivity.online() ? 'syncing' : 'pending',
      idempotencyKey,
      attempts: 0,
    };

    this.queueSignal.update((actions) => [action, ...actions].slice(0, 100));
    this.persist();

    if (this.connectivity.online()) {
      this.execute(action).subscribe();
    }

    return action;
  }

  syncPending(): Observable<OfflineAction[]> {
    if (this.syncing || !this.connectivity.online()) {
      return of(this.queueSignal());
    }
    this.syncing = true;
    const pending = this.queueSignal().filter((a) => a.status === 'pending' || a.status === 'failed');

    return from(pending).pipe(
      concatMap((action) => this.execute(action)),
      toArray(),
      finalize(() => {
        this.syncing = false;
      }),
    );
  }

  clearSynced(): void {
    this.queueSignal.update((actions) => actions.filter((a) => a.status !== 'synced'));
    this.persist();
  }

  private execute(action: OfflineAction): Observable<OfflineAction> {
    this.patch(action.id, { status: 'syncing', attempts: action.attempts + 1 });

    let op$: Observable<any>;
    switch (action.type) {
      case 'order.create': {
        const payload = action.payload as any;
        op$ = this.api.createOrder(payload);
        break;
      }
      case 'order.status.update': {
        const orderId = String(action.payload['orderId']);
        const status = action.payload['status'] as OrderStatus;
        const result = this.gateway.updateOrderStatus(orderId, status, 'optimistic');
        op$ = result ? of(result) : throwError(() => new Error(`Order ${orderId} not found`));
        break;
      }
      case 'order.priority.update': {
        const orderId = String(action.payload['orderId']);
        const priority = action.payload['priority'] as OrderPriority;
        const current = this.gateway.getOrder(orderId);
        if (!current) {
          op$ = throwError(() => new Error(`Order ${orderId} not found`));
        } else {
          this.gateway.publish({
            type: 'order.updated',
            payload: { ...current, priority, updatedAt: new Date().toISOString() },
            at: new Date().toISOString(),
          });
          op$ = of(current);
        }
        break;
      }
      case 'ai.request.refresh':
        // AI refresh is handled by the AI store after reconnect; queue entry marks intent.
        op$ = of(null);
        break;
      default:
        op$ = throwError(() => new Error(`Unsupported offline action: ${action.type}`));
    }

    return op$.pipe(
      map(() => action),
      tap(() => {
        this.processedKeys.add(action.idempotencyKey);
        this.patch(action.id, { status: 'synced', lastError: undefined });
      }),
      catchError((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Sync failed';
        this.patch(action.id, { status: 'failed', lastError: message });
        return of({ ...action, status: 'failed' as const, lastError: message });
      }),
    );
  }

  private patch(id: string, patch: Partial<OfflineAction>): void {
    this.queueSignal.update((actions) =>
      actions.map((action) => (action.id === id ? { ...action, ...patch } : action)),
    );
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queueSignal()));
  }

  private load(): OfflineAction[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      return (JSON.parse(raw) as OfflineAction[]).filter((a) => a.status !== 'synced');
    } catch {
      return [];
    }
  }
}
