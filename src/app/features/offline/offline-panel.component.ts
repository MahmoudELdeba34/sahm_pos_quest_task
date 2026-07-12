import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OfflineQueueService } from '../../core/services/offline-queue.service';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-offline-panel',
  standalone: true,
  imports: [DatePipe, EmptyStateComponent, StatusBadgeComponent, TranslatePipe],
  templateUrl: './offline-panel.component.html',
  styleUrl: './offline-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflinePanelComponent {
  readonly queue = inject(OfflineQueueService);
  readonly connectivity = inject(ConnectivityService);

  sync(): void {
    this.queue.syncPending().subscribe();
  }
}
