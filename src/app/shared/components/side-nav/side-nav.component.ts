import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslatePipe } from '@ngx-translate/core';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { UserProfileDialogComponent } from '../../../features/users/user-profile-dialog/user-profile-dialog.component';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly permission: string;
  readonly section: 'ops' | 'catalog' | 'admin';
  readonly i18nKey: string;
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, DialogModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideNavComponent {
  readonly auth = inject(AuthService);
  private readonly dialog = inject(Dialog);
  readonly collapsed = signal(false);

  private readonly allItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', permission: 'dashboard:read', section: 'ops', i18nKey: 'SIDE_NAV.DASHBOARD' },
    { label: 'Orders', path: '/orders', icon: 'receipt_long', permission: 'orders:read', section: 'ops', i18nKey: 'SIDE_NAV.ORDERS' },
    { label: 'Kitchen', path: '/kitchen', icon: 'skillet', permission: 'kitchen:read', section: 'ops', i18nKey: 'SIDE_NAV.KITCHEN' },
    { label: 'Insights', path: '/ai', icon: 'insights', permission: 'ai:read', section: 'ops', i18nKey: 'SIDE_NAV.INSIGHTS' },
    { label: 'Products', path: '/products', icon: 'inventory_2', permission: 'products:read', section: 'catalog', i18nKey: 'SIDE_NAV.PRODUCTS' },
    { label: 'Categories', path: '/categories', icon: 'category', permission: 'products:read', section: 'catalog', i18nKey: 'SIDE_NAV.CATEGORIES' },
    { label: 'Notifications', path: '/notifications', icon: 'notifications', permission: 'notifications:read', section: 'admin', i18nKey: 'SIDE_NAV.NOTIFICATIONS' },
    { label: 'Users', path: '/users', icon: 'group', permission: 'users:read', section: 'admin', i18nKey: 'SIDE_NAV.USERS' },
  ];

  readonly items = computed(() => this.allItems.filter((item) => this.auth.hasPermission(item.permission)));
  readonly ops = computed(() => this.items().filter((i) => i.section === 'ops'));
  readonly catalog = computed(() => this.items().filter((i) => i.section === 'catalog'));
  readonly admin = computed(() => this.items().filter((i) => i.section === 'admin'));

  toggle(): void {
    this.collapsed.update((v) => !v);
  }

  openProfile(): void {
    this.dialog.open(UserProfileDialogComponent, {
      panelClass: 'gos-dialog-container',
      hasBackdrop: true,
    });
  }
}
