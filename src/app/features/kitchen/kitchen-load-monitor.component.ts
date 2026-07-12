import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { KitchenStore } from './kitchen.store';
import { KitchenLoadLevel } from '../../core/models/kitchen.model';
import { AuthService } from '../../core/auth/auth.service';
import { GourmetApiClient } from '../../core/infrastructure/gourmet-api.client';
import { ToastService } from '../../core/services/toast.service';

import { LocalizedNumberPipe } from '../../shared/pipes/localized-number.pipe';

@Component({
  selector: 'app-kitchen-load-monitor',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, TranslatePipe, LocalizedNumberPipe],
  templateUrl: './kitchen-load-monitor.component.html',
  styleUrl: './kitchen-load-monitor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitchenLoadMonitorComponent {
  readonly store = inject(KitchenStore);
  private readonly auth = inject(AuthService);
  private readonly api = inject(GourmetApiClient);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    overallPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    grillTickets: [0, [Validators.required, Validators.min(0)]],
    grillCapacity: [8, [Validators.required, Validators.min(1)]],
    coldTickets: [0, [Validators.required, Validators.min(0)]],
    coldCapacity: [6, [Validators.required, Validators.min(1)]],
  });

  tone(level: KitchenLoadLevel): string {
    return level;
  }

  canWrite(): boolean {
    return this.auth.hasPermission('kitchen:write');
  }

  syncForm(): void {
    const snap = this.store.snapshot();
    const grill = snap.stations.find((s) => s.id === 'grill') ?? snap.stations[0];
    const cold = snap.stations.find((s) => s.id === 'cold') ?? snap.stations[1];
    this.form.patchValue({
      overallPercent: snap.overallPercent,
      grillTickets: grill?.activeTickets ?? 0,
      grillCapacity: grill?.capacity ?? 8,
      coldTickets: cold?.activeTickets ?? 0,
      coldCapacity: cold?.capacity ?? 6,
    });
  }

  save(): void {
    if (!this.canWrite() || this.form.invalid) return;
    const v = this.form.getRawValue();
    const stations = [
      {
        id: 'grill',
        name: 'Grill',
        activeTickets: v.grillTickets,
        capacity: v.grillCapacity,
        loadPercent: Math.min(100, Math.round((v.grillTickets / v.grillCapacity) * 100)),
      },
      {
        id: 'cold',
        name: 'Cold prep',
        activeTickets: v.coldTickets,
        capacity: v.coldCapacity,
        loadPercent: Math.min(100, Math.round((v.coldTickets / v.coldCapacity) * 100)),
      },
    ];
    const level: KitchenLoadLevel =
      v.overallPercent >= 85 ? 'critical' : v.overallPercent >= 70 ? 'high' : v.overallPercent >= 40 ? 'medium' : 'low';
    this.api
      .updateKitchen({
        level,
        overallPercent: v.overallPercent,
        stations,
        delayedOrderIds: [...this.store.snapshot().delayedOrderIds],
      })
      .subscribe({
        next: () => this.toast.success('Kitchen load updated'),
        error: () => this.toast.error('Update failed'),
      });
  }
}
