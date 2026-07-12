import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Order } from '../../../core/models/order.model';
import { OrdersStore } from '../orders.store';
import { AuthService } from '../../../core/auth/auth.service';
import { LocalizedNumberPipe } from '../../../shared/pipes/localized-number.pipe';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-order-details-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TranslatePipe, LocalizedNumberPipe],
  templateUrl: './order-details-dialog.component.html',
  styleUrl: './order-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsDialogComponent {
  readonly order = inject<Order>(DIALOG_DATA);
  readonly dialogRef = inject(DialogRef<void>);
  readonly store = inject(OrdersStore);
  readonly auth = inject(AuthService);
  readonly dialog = inject(DialogService);

  close(): void {
    this.dialogRef.close();
  }

  cancelOrder(): void {
    this.dialog.confirm({
      title: 'Cancel Order',
      message: 'Are you sure you want to cancel this order?',
      intent: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.store.applyStatus(this.order.id, 'cancelled');
        this.close();
      }
    });
  }

  advanceOrder(): void {
    this.store.advanceOrder(this.order.id);
    this.close();
  }

  get canWrite(): boolean {
    return this.auth.hasPermission('orders:write');
  }
}
