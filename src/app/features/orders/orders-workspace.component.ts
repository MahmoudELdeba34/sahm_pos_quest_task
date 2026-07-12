import { CurrencyPipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, computed, inject, signal, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, transferArrayItem } from '@angular/cdk/drag-drop';
import { Dialog } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { OrdersStore, OrdersFilter } from './orders.store';
import { KitchenStore } from '../kitchen/kitchen.store';
import { AiAssistantStore } from '../ai-assistant/ai-assistant.store';
import { Order, OrderPriority, OrderStatus } from '../../core/models/order.model';
import { Product } from '../../core/models/product.model';
import { AuthService } from '../../core/auth/auth.service';
import { RealtimeGatewayService } from '../../core/services/realtime-gateway.service';
import { ToastService } from '../../core/services/toast.service';
import { GourmetApiClient } from '../../core/infrastructure/gourmet-api.client';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { OfflineQueueService } from '../../core/services/offline-queue.service';
import { OrderDetailsDialogComponent } from './order-details-dialog/order-details-dialog.component';
import { LocalizedNumberPipe } from '../../shared/pipes/localized-number.pipe';

@Component({
  selector: 'app-orders-workspace',
  standalone: true,
  imports: [CurrencyPipe, DragDropModule, ReactiveFormsModule, TranslatePipe, LocalizedNumberPipe],
  templateUrl: './orders-workspace.component.html',
  styleUrl: './orders-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersWorkspaceComponent implements OnInit, OnDestroy {
  readonly store = inject(OrdersStore);
  readonly kitchen = inject(KitchenStore);
  readonly ai = inject(AiAssistantStore);
  readonly auth = inject(AuthService);
  private readonly gateway = inject(RealtimeGatewayService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(GourmetApiClient);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(Dialog);
  private readonly translate = inject(TranslateService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly offlineQueue = inject(OfflineQueueService);

  readonly viewMode = signal<'cards' | 'kanban'>('kanban');
  readonly showCreate = signal(false);
  readonly products = signal<Product[]>([]);
  readonly searchResults = signal<Product[]>([]);
  readonly isSearching = signal(false);
  readonly selectedItems = signal<{ product: Product, quantity: number }[]>([]);
  
  readonly searchControl = this.fb.control('');

  readonly now = signal(Date.now());
  private readonly timer = setInterval(() => this.now.set(Date.now()), 1000);

  readonly createForm = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    channel: ['walk-in' as Order['channel'], Validators.required],
    tableNumber: [''],
    deliveryAddress: [''],
    priority: ['normal' as Order['priority'], Validators.required],
    estimatedMinutes: [15, [Validators.required, Validators.min(5)]],
  });

  readonly filters: { label: string; value: OrdersFilter }[] = [
    { label: 'ORDERS.ALL_ORDERS', value: 'all' },
    { label: 'ORDERS.PREPARING', value: 'preparing' },
    { label: 'ORDERS.READY', value: 'ready' },
    { label: 'ORDERS.DELIVERY', value: 'delivery' },
  ];

  readonly columnDefs: { id: OrderStatus; title: string }[] = [
    { id: 'received', title: 'Received' },
    { id: 'preparing', title: 'Preparing' },
    { id: 'ready', title: 'Ready' },
    { id: 'delivered', title: 'Delivered' },
  ];

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.isSearching.set(true)),
      switchMap(term => this.api.searchProducts(term || '', null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      this.searchResults.set(res.products);
      this.isSearching.set(false);
    });

    this.api.searchProducts('', null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.products.set(res.products);
        this.searchResults.set(res.products);
      });
  }

  addItem(product: Product): void {
    this.selectedItems.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        return items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...items, { product, quantity: 1 }];
    });
    this.searchControl.setValue(''); // reset search to show all
  }

  updateQuantity(productId: string, delta: number): void {
    this.selectedItems.update(items => items.map(i => {
      if (i.product.id === productId) {
        const newQ = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQ };
      }
      return i;
    }));
  }

  removeItem(productId: string): void {
    this.selectedItems.update(items => items.filter(i => i.product.id !== productId));
  }

  readonly revenue = computed(() => this.store.orders().reduce((sum, o) => sum + o.total, 0));

  readonly board = computed(() => {
    const orders = this.store.filteredOrders();
    return this.columnDefs.map((col) => ({
      ...col,
      orders: orders.filter((o) => o.status === col.id),
    }));
  });

  readonly listIds = this.columnDefs.map((c) => c.id);

  elapsed(createdAt: string): string {
    const diff = Math.max(0, Math.floor((this.now() - new Date(createdAt).getTime()) / 1000));
    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  stripe(order: { isDelayed: boolean; priority: OrderPriority; status: OrderStatus; channel: string }): string {
    if (order.isDelayed || order.priority === 'urgent') return 'danger';
    if (order.status === 'ready') return 'ready';
    if (order.channel === 'delivery') return 'info';
    return 'primary';
  }

  actionLabel(status: OrderStatus): string {
    switch (status) {
      case 'received':
        return 'START';
      case 'preparing':
        return 'READY';
      case 'ready':
        return 'SERVE';
      case 'delivered':
        return 'COMPLETE';
      default:
        return 'ADVANCE';
    }
  }

  tipFor(orderId: string): string | null {
    const state = this.ai.state();
    if (state.orderId !== orderId || !state.suggestions.length) return null;
    return state.suggestions[0].message;
  }

  canWrite(): boolean {
    return this.auth.hasPermission('orders:write');
  }

  submitOrder(): void {
    if (!this.canWrite() || this.createForm.invalid || this.selectedItems().length === 0) {
      this.createForm.markAllAsTouched();
      if (this.selectedItems().length === 0) {
        this.toast.error('Please add at least one item');
      }
      return;
    }
    const v = this.createForm.getRawValue();
    
    const items = this.selectedItems().map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      notes: item.product.tags.join(', ')
    }));

    const payload = {
      channel: v.channel,
      customerName: v.customerName,
      tableNumber: v.channel === 'walk-in' ? v.tableNumber || undefined : undefined,
      deliveryAddress: v.channel === 'delivery' ? v.deliveryAddress || undefined : undefined,
      priority: v.priority,
      estimatedMinutes: v.estimatedMinutes,
      items,
    };

    if (!this.connectivity.online()) {
      const fakeId = `off-${Date.now()}`;
      const fakeOrder: Order = {
        id: fakeId,
        number: `O-OFF-${Math.floor(Math.random() * 9000) + 1000}`,
        status: 'received',
        channel: payload.channel,
        customerName: payload.customerName,
        tableNumber: payload.tableNumber,
        deliveryAddress: payload.deliveryAddress,
        priority: payload.priority,
        estimatedMinutes: payload.estimatedMinutes,
        items: payload.items.map((i, idx) => ({ id: `i-${idx}`, ...i })),
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: payload.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
        timeline: [],
        isDelayed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      this.store.addOptimisticOrder(fakeOrder);
      this.offlineQueue.enqueue('order.create', payload as any, `create:${fakeId}`);
      
      const isAr = this.translate.currentLang() === 'ar' || this.translate.fallbackLang() === 'ar';
      this.toast.success(isAr ? 'تم حفظ الطلب ليزامن لاحقاً' : 'Order saved offline', fakeOrder.number);
      
      this.showCreate.set(false);
      this.selectedItems.set([]);
      this.createForm.reset({
        customerName: '',
        channel: 'walk-in',
        tableNumber: '',
        deliveryAddress: '',
        priority: 'normal',
        estimatedMinutes: 15,
      });
      return;
    }

    this.api
      .createOrder(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.gateway.publish({ type: 'order.created', payload: order, at: order.createdAt });
          const isAr = this.translate.currentLang() === 'ar' || this.translate.fallbackLang() === 'ar';
          const msg = isAr ? 'تم إنشاء الطلب' : 'Order created';
          this.toast.success(msg, order.number);
          this.showCreate.set(false);
          this.selectedItems.set([]);
          this.createForm.reset({
            customerName: '',
            channel: 'walk-in',
            tableNumber: '',
            deliveryAddress: '',
            priority: 'normal',
            estimatedMinutes: 15,
          });
        },
        error: () => this.toast.error('Could not create order'),
      });
  }

  openOrderDetails(order: Order): void {
    this.store.selectOrder(order.id);
    this.dialog.open(OrderDetailsDialogComponent, {
      data: order,
      panelClass: 'gos-dialog-container',
      hasBackdrop: true,
    });
  }

  drop(event: CdkDragDrop<Order[]>, targetStatus: OrderStatus): void {
    if (!this.canWrite() || event.previousContainer === event.container) {
      return;
    }
    const order = event.previousContainer.data[event.previousIndex];
    if (!order) return;
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    this.store.selectOrder(order.id);
    this.store.applyStatus(order.id, targetStatus);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
