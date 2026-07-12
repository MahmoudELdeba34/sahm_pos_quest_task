import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
    title: 'Sahm Food POS - Sign in',
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    canActivate: [authGuard, permissionGuard(['dashboard:read'])],
    loadComponent: () =>
      import('./features/dashboard/exec-dashboard.component').then((m) => m.ExecDashboardComponent),
    title: 'Sahm Food POS - Dashboard',
  },
  {
    path: 'orders',
    canActivate: [authGuard, permissionGuard(['orders:read'])],
    loadComponent: () =>
      import('./features/orders/orders-workspace.component').then((m) => m.OrdersWorkspaceComponent),
    title: 'Sahm Food POS - Live Orders',
  },
  {
    path: 'ai',
    canActivate: [authGuard, permissionGuard(['ai:read'])],
    loadComponent: () =>
      import('./features/ai-assistant/ai-assistant-panel.component').then((m) => m.AiAssistantPanelComponent),
    title: 'Sahm Food POS - AI Insights',
  },
  {
    path: 'kitchen',
    canActivate: [authGuard, permissionGuard(['kitchen:read'])],
    loadComponent: () =>
      import('./features/kitchen/kitchen-load-monitor.component').then((m) => m.KitchenLoadMonitorComponent),
    title: 'Sahm Food POS - Kitchen',
  },
  {
    path: 'products',
    canActivate: [authGuard, permissionGuard(['products:read'])],
    loadComponent: () =>
      import('./features/search/product-search.component').then((m) => m.ProductSearchComponent),
    title: 'Sahm Food POS - Products',
  },
  {
    path: 'categories',
    canActivate: [authGuard, permissionGuard(['products:read'])],
    loadComponent: () =>
      import('./features/categories/categories-page.component').then((m) => m.CategoriesPageComponent),
    title: 'Sahm Food POS - Categories',
  },
  {
    path: 'notifications',
    canActivate: [authGuard, permissionGuard(['notifications:read'])],
    loadComponent: () =>
      import('./features/notifications/notifications-page.component').then((m) => m.NotificationsPageComponent),
    title: 'Sahm Food POS - Notifications',
  },
  {
    path: 'users',
    canActivate: [authGuard, permissionGuard(['users:read'])],
    loadComponent: () =>
      import('./features/users/users-page.component').then((m) => m.UsersPageComponent),
    title: 'Sahm Food POS - Users',
  },
  { path: '**', redirectTo: 'dashboard' },
];
