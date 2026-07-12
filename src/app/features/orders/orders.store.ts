import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Order, OrderChannel, OrderStatus, nextOrderStatus } from '../../core/models/order.model';
import { RealtimeGatewayService } from '../../core/services/realtime-gateway.service';
import { OfflineQueueService } from '../../core/services/offline-queue.service';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { KitchenStore } from '../kitchen/kitchen.store';

export type OrdersFilter = 'all' | OrderChannel | OrderStatus;

/**
 * Feature store for live orders.
 * Presentation components bind to signals only — no business logic in templates.
 */
@Injectable({ providedIn: 'root' })
export class OrdersStore implements OnDestroy {
  private readonly gateway = inject(RealtimeGatewayService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly kitchenStore = inject(KitchenStore);
  private readonly destroy$ = new Subject<void>();

  private readonly ordersSignal = signal<Order[]>(this.gateway.getSnapshotOrders());
  private readonly selectedIdSignal = signal<string | null>(this.ordersSignal()[0]?.id ?? null);
  private readonly filterSignal = signal<OrdersFilter>('all');
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly lastEventSignal = signal<string | null>(null);

  readonly orders = this.ordersSignal.asReadonly();
  readonly selectedId = this.selectedIdSignal.asReadonly();
  readonly filter = this.filterSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly lastEvent = this.lastEventSignal.asReadonly();

  readonly filteredOrders = computed(() => {
    const activeFilter = this.filterSignal();
    const delayedIds = new Set(this.kitchenStore.snapshot().delayedOrderIds);

    return this.ordersSignal()
      .map((order) => {
        if (!delayedIds.has(order.id) || order.isDelayed) {
          return order;
        }
        return {
          ...order,
          isDelayed: true,
          priority: order.priority === 'normal' ? ('high' as const) : ('urgent' as const),
        };
      })
      .filter((order) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'walk-in' || activeFilter === 'delivery' || activeFilter === 'online') {
          return order.channel === activeFilter;
        }
        return order.status === activeFilter;
      })
      .sort((a, b) => {
        const priorityRank = { urgent: 0, high: 1, normal: 2 } as const;
        const byPriority = priorityRank[a.priority] - priorityRank[b.priority];
        if (byPriority !== 0) return byPriority;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  });

  readonly selectedOrder = computed(() => {
    const id = this.selectedIdSignal();
    return (
      this.filteredOrders().find((o) => o.id === id) ??
      this.ordersSignal().find((o) => o.id === id) ??
      null
    );
  });

  readonly counts = computed(() => {
    const all = this.ordersSignal();
    return {
      total: all.length,
      active: all.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length,
      delayed: all.filter((o) => o.isDelayed || this.kitchenStore.snapshot().delayedOrderIds.includes(o.id)).length,
    };
  });

  constructor() {
    this.bindRealtime();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectOrder(orderId: string): void {
    this.selectedIdSignal.set(orderId);
  }

  setFilter(activeFilter: OrdersFilter): void {
    this.filterSignal.set(activeFilter);
  }

  advanceSelected(): void {
    const order = this.selectedOrder();
    if (!order) {
      return;
    }
    this.advanceOrder(order.id);
  }

  advanceOrder(orderId: string): void {
    const order = this.ordersSignal().find((o) => o.id === orderId);
    if (!order) {
      return;
    }

    const next = nextOrderStatus(order.status);
    if (!next) {
      return;
    }

    this.applyStatus(orderId, next);
  }

  applyStatus(orderId: string, status: OrderStatus): void {
    const order = this.ordersSignal().find((o) => o.id === orderId);
    if (!order || order.status === status) {
      return;
    }

    this.patchOrder(orderId, { status, updatedAt: new Date().toISOString() });

    const idempotencyKey = `status:${orderId}:${status}`;
    if (!this.connectivity.online()) {
      this.offlineQueue.enqueue('order.status.update', { orderId, status }, idempotencyKey);
      this.lastEventSignal.set(`Queued status → ${status} (offline)`);
      return;
    }

    const updated = this.gateway.updateOrderStatus(orderId, status, 'optimistic');
    if (!updated) {
      this.errorSignal.set(`Failed to update order ${orderId}`);
      return;
    }
    this.lastEventSignal.set(`Status → ${status}`);
  }

  addOptimisticOrder(order: Order): void {
    this.upsert(order);
  }

  private bindRealtime(): void {
    this.gateway.events$.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event.type === 'order.created') {
        const order = event.payload as Order;
        this.ordersSignal.update((orders) => {
          if (orders.some((o) => o.id === order.id)) {
            return orders;
          }
          return [order, ...orders];
        });
        this.lastEventSignal.set(`New order ${order.number}`);
        return;
      }

      if (event.type === 'order.updated') {
        const order = event.payload as Order;
        this.upsert(order);
        this.lastEventSignal.set(`Updated ${order.number}`);
        return;
      }

      if (event.type === 'order.status') {
        const payload = event.payload as { orderId: string; status: OrderStatus; source: string };
        this.patchOrder(payload.orderId, {
          status: payload.status,
          updatedAt: event.at,
        });
        this.lastEventSignal.set(`Live ${payload.source}: ${payload.status}`);
      }
    });
  }

  private upsert(order: Order): void {
    this.ordersSignal.update((orders) => {
      const index = orders.findIndex((o) => o.id === order.id);
      if (index === -1) {
        return [order, ...orders];
      }
      const clone = orders.slice();
      clone[index] = order;
      return clone;
    });
  }

  private patchOrder(orderId: string, patch: Partial<Order>): void {
    this.ordersSignal.update((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, ...patch } : order)),
    );
  }
}
