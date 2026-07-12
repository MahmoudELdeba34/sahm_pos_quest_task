import { Component, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { NotificationsService } from '../../../core/services/notifications.service';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [DrawerComponent, DatePipe, NgClass],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss'
})
export class NotificationCenterComponent {
  private readonly notificationService = inject(NotificationsService);
  
  readonly notifications = this.notificationService.items;
  readonly unreadCount = this.notificationService.unreadCount;
  
  isOpen = false;

  openDrawer() {
    this.isOpen = true;
  }

  closeDrawer() {
    this.isOpen = false;
  }
}
