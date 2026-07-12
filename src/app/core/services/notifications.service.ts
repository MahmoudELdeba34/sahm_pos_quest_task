import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppNotification, GourmetApiClient } from '../infrastructure/gourmet-api.client';
import { AuthService } from '../auth/auth.service';
import { SocketRealtimeClient } from '../infrastructure/socket-realtime.client';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(GourmetApiClient);
  private readonly auth = inject(AuthService);
  private readonly socket = inject(SocketRealtimeClient);

  private readonly itemsSignal = signal<AppNotification[]>([]);
  readonly items = this.itemsSignal.asReadonly();
  readonly unreadCount = computed(() => this.itemsSignal().filter((n) => !n.read).length);

  constructor() {
    this.socket.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'notification.created' && event.payload) {
        const n = event.payload as AppNotification;
        this.itemsSignal.update((list) => [n, ...list.filter((x) => x.id !== n.id)]);
      }
    });
  }

  hydrate(): void {
    if (!this.auth.hasPermission('notifications:read')) {
      this.itemsSignal.set([]);
      return;
    }
    this.api.getNotifications().subscribe({
      next: (data) => this.itemsSignal.set(data),
      error: () => undefined,
    });
  }

  upsert(item: AppNotification): void {
    this.itemsSignal.update((list) => {
      const rest = list.filter((n) => n.id !== item.id);
      return [item, ...rest];
    });
  }

  removeLocal(id: string): void {
    this.itemsSignal.update((list) => list.filter((n) => n.id !== id));
  }
}
