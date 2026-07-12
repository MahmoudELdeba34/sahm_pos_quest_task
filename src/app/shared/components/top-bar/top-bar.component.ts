import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NotificationCenterComponent } from '../../../features/notifications/notification-center/notification-center.component';

import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { UserProfileDialogComponent } from '../../../features/users/user-profile-dialog/user-profile-dialog.component';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [TranslatePipe, NotificationCenterComponent, DialogModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  readonly title = signal('Sahm Food POS');
  readonly subtitle = signal('Downtown Bistro');
  readonly openPalette = output<void>();

  readonly connectivity = inject(ConnectivityService);
  readonly offlineQueue = inject(OfflineQueueService);
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  readonly translate = inject(TranslateService);
  private readonly dialog = inject(Dialog);

  toggleLanguage(): void {
    const current = this.translate.currentLang() || this.translate.fallbackLang() || 'en';
    this.translate.use(current === 'en' ? 'ar' : 'en');
  }

  openProfile(): void {
    this.dialog.open(UserProfileDialogComponent, {
      panelClass: 'gos-dialog-container',
      hasBackdrop: true,
    });
  }
}
