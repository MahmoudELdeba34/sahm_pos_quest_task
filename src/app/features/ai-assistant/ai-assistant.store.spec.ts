import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { AiAssistantStore } from './ai-assistant.store';
import { AiAssistantApiService, AiStreamChunk } from '../../core/services/ai-assistant-api.service';
import { OrdersStore } from '../orders/orders.store';
import { KitchenStore } from '../kitchen/kitchen.store';
import { OfflineQueueService } from '../../core/services/offline-queue.service';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { Order } from '../../core/models/order.model';

describe('AiAssistantStore', () => {
  const order: Order = {
    id: 'ord-ai',
    number: 'A-9',
    channel: 'delivery',
    status: 'preparing',
    priority: 'high',
    customerName: 'Guest',
    items: [{ id: 'i1', name: 'Pasta', quantity: 1, unitPrice: 90, allergens: ['gluten'] }],
    total: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedMinutes: 20,
    isDelayed: false,
    deliveryAddress: 'Cairo',
  };

  function createStore(streamImpl: jasmine.Spy): AiAssistantStore {
    const selected = signal<Order | null>(order);
    const online = signal(true);

    TestBed.configureTestingModule({
      providers: [
        AiAssistantStore,
        {
          provide: AiAssistantApiService,
          useValue: {
            streamRecommendations: streamImpl,
            resetAttempts: jasmine.createSpy('resetAttempts'),
          },
        },
        {
          provide: OrdersStore,
          useValue: {
            selectedOrder: selected.asReadonly(),
            orders: signal([order]).asReadonly(),
          },
        },
        {
          provide: KitchenStore,
          useValue: {
            snapshot: signal({
              level: 'medium',
              overallPercent: 55,
              stations: [],
              delayedOrderIds: [],
              updatedAt: new Date().toISOString(),
            }).asReadonly(),
          },
        },
        { provide: OfflineQueueService, useValue: { enqueue: jasmine.createSpy('enqueue') } },
        { provide: ConnectivityService, useValue: { online: online.asReadonly() } },
      ],
    });

    return TestBed.inject(AiAssistantStore);
  }

  it('streams tokens then reaches success', fakeAsync(() => {
    const chunks = new Subject<AiStreamChunk>();
    const streamSpy = jasmine.createSpy('streamRecommendations').and.returnValue(chunks.asObservable());
    const store = createStore(streamSpy);

    store.refresh();
    tick();

    chunks.next({ kind: 'token', text: 'Hello ' });
    chunks.next({
      kind: 'suggestion',
      suggestion: {
        id: 's1',
        type: 'allergy',
        title: 'Allergy',
        message: 'gluten',
        confidence: 0.9,
        actionable: false,
      },
    });
    chunks.next({ kind: 'done' });
    chunks.complete();

    expect(store.partialText()).toContain('Hello');
    expect(store.suggestions().length).toBe(1);
    expect(store.status()).toBe('success');
  }));

  it('ends in error after retries are exhausted', fakeAsync(() => {
    const streamSpy = jasmine
      .createSpy('streamRecommendations')
      .and.returnValue(throwError(() => new Error('AI service temporarily unavailable')));

    const store = createStore(streamSpy);
    store.refresh();
    tick(0);
    tick(600);
    tick(1200);
    tick(2400);

    expect(store.status()).toBe('error');
    expect(store.error()).toContain('temporarily unavailable');
    expect(streamSpy).toHaveBeenCalled();
    expect(streamSpy.calls.count()).toBeGreaterThanOrEqual(1);
  }));
});
