import { Injectable, OnDestroy, inject } from '@angular/core';
import { Observable, Subject, catchError, forkJoin, merge, of, share, takeUntil, tap } from 'rxjs';
import { ConnectivityService } from './connectivity.service';
import { Order, OrderStatus, nextOrderStatus } from '../models/order.model';
import { RealtimeEnvelope } from '../models/realtime.model';
import { environment } from '../../../environments/environment';
import { GourmetApiClient } from '../infrastructure/gourmet-api.client';
import { SocketRealtimeClient } from '../infrastructure/socket-realtime.client';

/**
 * Realtime gateway — remote API + Socket.IO only (no local seed data).
 */
@Injectable({ providedIn: 'root' })
export class RealtimeGatewayService implements OnDestroy {
  private readonly connectivity = inject(ConnectivityService);
  private readonly api = inject(GourmetApiClient);
  private readonly socket = inject(SocketRealtimeClient);
  private readonly destroy$ = new Subject<void>();
  private readonly manual$ = new Subject<RealtimeEnvelope>();
  private readonly orders = new Map<string, Order>();
  private readonly remote = environment.useRemoteBackend;

  readonly events$: Observable<RealtimeEnvelope> = merge(
    this.manual$,
    this.remote ? this.socket.events$ : of(),
  ).pipe(
    tap((event) => this.applySideEffects(event)),
    share(),
    takeUntil(this.destroy$),
  );

  constructor() {
    if (this.remote) {
      this.socket.connect();
      this.hydrateFromApi();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Re-fetch orders + kitchen from REST (call after login). */
  hydrateFromApi(): void {
    forkJoin({
      orders: this.api.getOrders().pipe(catchError(() => of([] as Order[]))),
      kitchen: this.api.getKitchen().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ orders, kitchen }) => {
        this.orders.clear();
        for (const order of orders) {
          this.orders.set(order.id, order);
          this.manual$.next({ type: 'order.updated', payload: order, at: order.updatedAt });
        }
        if (kitchen) {
          this.manual$.next({
            type: 'kitchen.load',
            payload: kitchen,
            at: kitchen.updatedAt,
          });
        }
      });
  }

  getSnapshotOrders(): Order[] {
    return [...this.orders.values()].map((o) => structuredClone(o));
  }

  getOrder(orderId: string): Order | undefined {
    const order = this.orders.get(orderId);
    return order ? structuredClone(order) : undefined;
  }

  publish(event: RealtimeEnvelope): void {
    this.manual$.next(event);
  }

  createOrder(payload: Parameters<GourmetApiClient['createOrder']>[0]): void {
    if (!this.remote || !this.connectivity.online()) {
      return;
    }
    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.orders.set(order.id, order);
        this.publish({ type: 'order.created', payload: order, at: order.createdAt });
      },
    });
  }

  updateOrderStatus(orderId: string, status: OrderStatus, source: 'manual' | 'optimistic' = 'manual'): Order | null {
    const current = this.orders.get(orderId);
    if (!current) {
      return null;
    }
    const updated: Order = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(orderId, updated);

    if (this.remote && this.connectivity.online()) {
      this.api.patchOrderStatus(orderId, status).subscribe({
        next: (serverOrder) => {
          this.orders.set(serverOrder.id, serverOrder);
          this.publish({ type: 'order.updated', payload: serverOrder, at: serverOrder.updatedAt });
        },
        error: () => {
          // keep optimistic local state
        },
      });
    }

    this.publish({
      type: 'order.status',
      payload: { orderId, status, at: updated.updatedAt, source },
      at: updated.updatedAt,
    });
    this.publish({
      type: 'order.updated',
      payload: structuredClone(updated),
      at: updated.updatedAt,
    });
    return structuredClone(updated);
  }

  advanceOrder(orderId: string): Order | null {
    const current = this.orders.get(orderId);
    if (!current) {
      return null;
    }
    const next = nextOrderStatus(current.status);
    if (!next) {
      return current;
    }
    return this.updateOrderStatus(orderId, next, 'manual');
  }

  private applySideEffects(event: RealtimeEnvelope): void {
    if (event.type === 'order.created' || event.type === 'order.updated') {
      const order = event.payload as Order;
      this.orders.set(order.id, structuredClone(order));
    }
    if (event.type === 'order.deleted') {
      const payload = event.payload as { id: string };
      this.orders.delete(payload.id);
    }
    if (event.type === 'order.status') {
      const payload = event.payload as { orderId: string; status: OrderStatus };
      const current = this.orders.get(payload.orderId);
      if (current) {
        this.orders.set(payload.orderId, {
          ...current,
          status: payload.status,
          updatedAt: event.at,
        });
      }
    }
  }
}
