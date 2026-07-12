import { TestBed } from '@angular/core/testing';
import { OrdersStore } from './orders.store';
import { RealtimeGatewayService } from '../../core/services/realtime-gateway.service';
import { OfflineQueueService } from '../../core/services/offline-queue.service';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { KitchenStore } from '../kitchen/kitchen.store';
import { Subject } from 'rxjs';
import { Order } from '../../core/models/order.model';
import { RealtimeEnvelope } from '../../core/models/realtime.model';
import { signal } from '@angular/core';

describe('OrdersStore', () => {
  let store: OrdersStore;
  let events$: Subject<RealtimeEnvelope>;
  let updateSpy: jasmine.Spy;
  let enqueueSpy: jasmine.Spy;
  let onlineSignal: ReturnType<typeof signal<boolean>>;

  const seed: Order = {
    id: 'ord-1',
    number: 'A-1',
    channel: 'walk-in',
    status: 'received',
    priority: 'normal',
    customerName: 'Test',
    items: [{ id: 'i1', name: 'Item', quantity: 1, unitPrice: 10 }],
    total: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedMinutes: 10,
    isDelayed: false,
  };

  beforeEach(() => {
    events$ = new Subject<RealtimeEnvelope>();
    updateSpy = jasmine.createSpy('updateOrderStatus').and.callFake((id: string, status: Order['status']) => ({
      ...seed,
      id,
      status,
      updatedAt: new Date().toISOString(),
    }));
    enqueueSpy = jasmine.createSpy('enqueue');
    onlineSignal = signal(true);

    TestBed.configureTestingModule({
      providers: [
        OrdersStore,
        {
          provide: RealtimeGatewayService,
          useValue: {
            events$,
            getSnapshotOrders: () => [seed],
            updateOrderStatus: updateSpy,
          },
        },
        {
          provide: OfflineQueueService,
          useValue: { enqueue: enqueueSpy },
        },
        {
          provide: ConnectivityService,
          useValue: { online: onlineSignal.asReadonly() },
        },
        {
          provide: KitchenStore,
          useValue: {
            snapshot: signal({
              level: 'low',
              overallPercent: 20,
              stations: [],
              delayedOrderIds: [],
              updatedAt: new Date().toISOString(),
            }).asReadonly(),
          },
        },
      ],
    });

    store = TestBed.inject(OrdersStore);
  });

  it('applies live status updates from the gateway', () => {
    events$.next({
      type: 'order.status',
      payload: { orderId: 'ord-1', status: 'preparing', at: new Date().toISOString(), source: 'websocket' },
      at: new Date().toISOString(),
    });
    expect(store.orders()[0].status).toBe('preparing');
  });

  it('optimistically advances order status while online', () => {
    store.advanceOrder('ord-1');
    expect(store.orders()[0].status).toBe('preparing');
    expect(updateSpy).toHaveBeenCalled();
  });

  it('queues status updates while offline and avoids duplicate gateway calls', () => {
    onlineSignal.set(false);
    store.advanceOrder('ord-1');
    expect(enqueueSpy).toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(store.orders()[0].status).toBe('preparing');
  });
});
