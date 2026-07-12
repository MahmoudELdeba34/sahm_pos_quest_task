import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppNotification, GourmetApiClient } from '../../core/infrastructure/gourmet-api.client';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationsService } from '../../core/services/notifications.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, TranslatePipe],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent implements OnInit {
  private readonly api = inject(GourmetApiClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly notifications = inject(NotificationsService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    body: ['', [Validators.required, Validators.minLength(2)]],
    severity: ['info' as AppNotification['severity'], Validators.required],
  });

  ngOnInit(): void {
    this.reload();
  }

  canWrite(): boolean {
    return this.auth.hasPermission('notifications:write');
  }

  reload(): void {
    this.loading.set(true);
    this.api.getNotifications().subscribe({
      next: (data) => {
        this.items.set(data);
        this.notifications.hydrate();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load notifications');
      },
    });
  }

  create(): void {
    if (!this.canWrite() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.api.createNotification(this.form.getRawValue()).subscribe({
      next: (n) => {
        this.items.update((list) => [n, ...list]);
        this.notifications.upsert(n);
        this.form.reset({ title: '', body: '', severity: 'info' });
        this.toast.success('Notification created');
      },
      error: () => this.toast.error('Create failed'),
    });
  }

  markRead(item: AppNotification): void {
    if (item.read) return;
    this.api.markNotificationRead(item.id).subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((n) => (n.id === updated.id ? updated : n)));
        this.notifications.upsert(updated);
        this.toast.info('Marked as read');
      },
      error: () => this.toast.error('Update failed'),
    });
  }

  remove(item: AppNotification): void {
    if (!this.canWrite()) return;
    this.api.deleteNotification(item.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((n) => n.id !== item.id));
        this.notifications.removeLocal(item.id);
        this.toast.success('Notification deleted');
      },
      error: () => this.toast.error('Delete failed'),
    });
  }
}
