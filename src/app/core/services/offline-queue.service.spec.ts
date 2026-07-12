import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OfflineQueueService } from './offline-queue.service';
import { ConnectivityService } from './connectivity.service';
import { RealtimeGatewayService } from './realtime-gateway.service';
import { IdGeneratorService } from '../utils/id-generator.service';

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let connectivity: ConnectivityService;
  let updateSpy: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    updateSpy = jasmine.createSpy('updateOrderStatus').and.returnValue({
      id: 'ord-1',
      status: 'preparing',
    });

    TestBed.configureTestingModule({
      providers: [
        OfflineQueueService,
        ConnectivityService,
        IdGeneratorService,
        {
          provide: RealtimeGatewayService,
          useValue: {
            updateOrderStatus: updateSpy,
            getOrder: () => null,
            publish: jasmine.createSpy('publish'),
          },
        },
      ],
    });

    service = TestBed.inject(OfflineQueueService);
    connectivity = TestBed.inject(ConnectivityService);
  });

  it('queues actions while offline and syncs once online', fakeAsync(() => {
    connectivity.simulateOffline();
    service.enqueue('order.status.update', { orderId: 'ord-1', status: 'preparing' }, 'status:ord-1:preparing');
    expect(service.pendingCount()).toBe(1);
    expect(updateSpy).not.toHaveBeenCalled();

    connectivity.simulateOnline();
    service.syncPending().subscribe();
    tick();

    expect(updateSpy).toHaveBeenCalled();
    expect(service.actions().some((a) => a.status === 'synced')).toBeTrue();
  }));

  it('prevents duplicate idempotency keys', () => {
    connectivity.simulateOffline();
    service.enqueue('order.status.update', { orderId: 'ord-1', status: 'preparing' }, 'same-key');
    service.enqueue('order.status.update', { orderId: 'ord-1', status: 'preparing' }, 'same-key');
    expect(service.actions().filter((a) => a.idempotencyKey === 'same-key').length).toBe(1);
  });
});
