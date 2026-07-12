import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrdersStore } from '../orders/orders.store';
import { KitchenStore } from '../kitchen/kitchen.store';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { Order } from '../../core/models/order.model';
import { RealtimeGatewayService } from '../../core/services/realtime-gateway.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-exec-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './exec-dashboard.component.html',
  styleUrl: './exec-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecDashboardComponent {
  private readonly orders = inject(OrdersStore);
  private readonly kitchen = inject(KitchenStore);
  private readonly gateway = inject(RealtimeGatewayService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly connectivity = inject(ConnectivityService);

  readonly revenue = computed(() =>
    this.orders.orders().reduce((sum: number, order: Order) => sum + order.total, 0),
  );
  readonly liveOrders = computed(() => this.orders.counts().active);
  readonly kitchenLoad = computed(() => this.kitchen.overallPercent());
  readonly kitchenLevel = computed(() => this.kitchen.level());
  readonly avgPrep = computed(() => {
    const active = this.orders.orders().filter((o: Order) => o.status !== 'completed');
    if (!active.length) return 0;
    return Math.round(active.reduce((s: number, o: Order) => s + o.estimatedMinutes, 0) / active.length);
  });
  readonly delayed = computed(() => this.orders.counts().delayed);
  readonly recent = computed(() => this.orders.filteredOrders().slice(0, 3));

  createOrder(): void {
    if (!this.auth.hasPermission('orders:write')) {
      void this.router.navigateByUrl('/orders');
      return;
    }
    const n = Math.floor(1000 + Math.random() * 9000);
    this.gateway.createOrder({
      channel: 'walk-in',
      customerName: `Guest ${n}`,
      tableNumber: String(1 + Math.floor(Math.random() * 20)),
      priority: 'normal',
      estimatedMinutes: 15,
      items: [{ name: 'House Special', quantity: 1, unitPrice: 120 }],
    });
    void this.router.navigateByUrl('/orders');
  }
}
