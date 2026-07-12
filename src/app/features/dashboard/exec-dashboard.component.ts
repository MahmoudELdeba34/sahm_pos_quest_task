import { CurrencyPipe, DecimalPipe, PercentPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersStore } from '../orders/orders.store';
import { KitchenStore } from '../kitchen/kitchen.store';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { Order } from '../../core/models/order.model';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { LocalizedNumberPipe } from '../../shared/pipes/localized-number.pipe';

@Component({
  selector: 'app-exec-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, PercentPipe, DatePipe, RouterLink, TranslatePipe, BaseChartDirective, LocalizedNumberPipe],
  templateUrl: './exec-dashboard.component.html',
  styleUrl: './exec-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecDashboardComponent {
  private readonly ordersStore = inject(OrdersStore);
  private readonly kitchen = inject(KitchenStore);
  readonly connectivity = inject(ConnectivityService);
  private readonly translate = inject(TranslateService);

  // --- High-Level KPIs ---
  readonly targetRevenue = 20000; // Daily Goal
  
  readonly revenue = computed(() =>
    this.ordersStore.orders().reduce((sum: number, order: Order) => sum + order.total, 0),
  );
  
  readonly revenueProgress = computed(() => 
    Math.min((this.revenue() / this.targetRevenue) * 100, 100)
  );

  readonly liveOrders = computed(() => this.ordersStore.counts().active);
  
  readonly avgTicketSize = computed(() => {
    const orders = this.ordersStore.orders().filter(o => o.status !== 'cancelled');
    if (!orders.length) return 0;
    return this.revenue() / orders.length;
  });

  readonly cancellationRate = computed(() => {
    const all = this.ordersStore.orders();
    if (!all.length) return 0;
    const cancelled = all.filter(o => o.status === 'cancelled').length;
    return cancelled / all.length;
  });

  readonly delayed = computed(() => this.ordersStore.counts().delayed);
  readonly recent = computed(() => this.ordersStore.filteredOrders().slice(0, 5));

  // --- Chart Data Computations ---
  
  // 1. Hourly Revenue Trend
  readonly hourlyRevenueChartData = computed(() => {
    const lang = this.translate.currentLang() || this.translate.fallbackLang() || 'en';
    const localize = (val: string | number) => {
      const str = String(val);
      if (lang === 'ar') {
        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return str.replace(/[0-9]/g, (d) => arabicDigits[parseInt(d, 10)]);
      }
      return str;
    };
    
    const hours = Array.from({ length: 12 }, (_, i) => localize(`${i + 10}:00`)); // 10 AM to 9 PM
    const data = new Array(12).fill(0);
    
    this.ordersStore.orders().forEach(order => {
      if (order.status === 'cancelled') return;
      const hour = new Date(order.createdAt).getHours();
      const index = hour - 10;
      if (index >= 0 && index < 12) {
        data[index] += order.total;
      }
    });

    return {
      labels: hours,
      datasets: [
        {
          data: data,
          label: 'Revenue',
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  });

  readonly hourlyChartOptions = computed(() => {
    const lang = this.translate.currentLang() || this.translate.fallbackLang() || 'en';
    const localize = (val: string | number) => {
      const str = String(val);
      if (lang === 'ar') {
        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return str.replace(/[0-9]/g, (d) => arabicDigits[parseInt(d, 10)]);
      }
      return str;
    };
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: {
            callback: function(value: any) {
              return localize(value);
            }
          }
        }
      }
    };
  });

  // 2. Channel Distribution
  readonly channelChartData = computed(() => {
    const counts = { 'walk-in': 0, 'delivery': 0, 'online': 0 };
    this.ordersStore.orders().forEach(order => {
      if (order.channel === 'walk-in') counts['walk-in']++;
      else if (order.channel === 'delivery') counts['delivery']++;
      else if (order.channel === 'online') counts['online']++;
    });

    return {
      labels: ['Walk-in', 'Delivery', 'Online'],
      datasets: [{
        data: [counts['walk-in'], counts['delivery'], counts['online']],
        backgroundColor: ['#2196f3', '#ff9800', '#9c27b0']
      }]
    };
  });

  readonly doughnutOptions = computed(() => {
    this.translate.currentLang(); // Track language changes
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' as const }
      }
    };
  });

  // --- Top Sellers ---
  readonly topSellers = computed(() => {
    const itemsCount = new Map<string, {name: string, count: number, revenue: number}>();
    this.ordersStore.orders().forEach(order => {
      if (order.status === 'cancelled') return;
      order.items.forEach(item => {
        const existing = itemsCount.get(item.name) || { name: item.name, count: 0, revenue: 0 };
        existing.count += item.quantity;
        existing.revenue += (item.quantity * item.unitPrice);
        itemsCount.set(item.name, existing);
      });
    });
    return Array.from(itemsCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  });

  // --- Kitchen Telemetry ---
  readonly kitchenLoad = computed(() => this.kitchen.overallPercent());
  readonly kitchenLevel = computed(() => this.kitchen.level());
  readonly stations = computed(() => {
    const load = this.kitchenLoad();
    return [
      { name: 'GRILL_HOT', load: Math.min(load + 15, 100) },
      { name: 'PREP_COLD', load: Math.max(load - 20, 10) },
      { name: 'PACKAGING', load: Math.max(load - 30, 5) }
    ];
  });

  // --- AI Insights ---
  readonly aiInsights = computed(() => {
    const load = this.kitchenLoad();
    const rate = this.cancellationRate();
    if (load > 85) {
      return {
        icon: 'warning',
        title: 'HIGH_BOTTLENECK',
        desc: 'GRILL_CAPACITY_WARNING',
        tone: 'danger'
      };
    }
    if (rate > 0.1) {
      return {
        icon: 'trending_down',
        title: 'ELEVATED_CANCELLATIONS',
        desc: 'HIGH_CANCEL_RATE_WARNING',
        tone: 'warning'
      };
    }
    return {
      icon: 'insights',
      title: 'OPTIMAL_OPERATIONS',
      desc: 'FLOW_IS_SMOOTH',
      tone: 'success'
    };
  });
}
