import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { KitchenLoadSnapshot } from '../../core/models/kitchen.model';
import { RealtimeGatewayService } from '../../core/services/realtime-gateway.service';

const EMPTY_SNAPSHOT: KitchenLoadSnapshot = {
  level: 'low',
  overallPercent: 0,
  stations: [],
  delayedOrderIds: [],
  updatedAt: new Date(0).toISOString(),
};

@Injectable({ providedIn: 'root' })
export class KitchenStore implements OnDestroy {
  private readonly gateway = inject(RealtimeGatewayService);
  private readonly destroy$ = new Subject<void>();

  private readonly snapshotSignal = signal<KitchenLoadSnapshot>(EMPTY_SNAPSHOT);

  readonly snapshot = this.snapshotSignal.asReadonly();
  readonly level = computed(() => this.snapshotSignal().level);
  readonly overallPercent = computed(() => this.snapshotSignal().overallPercent);
  readonly stations = computed(() => this.snapshotSignal().stations);
  readonly delayedCount = computed(() => this.snapshotSignal().delayedOrderIds.length);

  constructor() {
    this.gateway.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event.type === 'kitchen.load') {
          this.snapshotSignal.set(event.payload as KitchenLoadSnapshot);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
