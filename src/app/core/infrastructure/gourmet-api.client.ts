import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderStatus } from '../models/order.model';
import { Product } from '../models/product.model';
import { KitchenLoadSnapshot } from '../models/kitchen.model';
import { AuthUser, AppRole } from '../auth/auth.service';

export interface CreateOrderPayload {
  channel: Order['channel'];
  customerName: string;
  priority?: Order['priority'];
  tableNumber?: string;
  deliveryAddress?: string;
  estimatedMinutes?: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    allergens?: string[];
  }>;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  createdAt: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class GourmetApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getOrders(): Observable<Order[]> {
    return this.http.get<{ data: Order[] }>(`${this.base}/orders`).pipe(map((r) => r.data));
  }

  getOrderById(id: string): Observable<Order> {
    return this.http.get<{ data: Order }>(`${this.base}/orders/${id}`).pipe(map((r) => r.data));
  }

  createOrder(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<{ data: Order }>(`${this.base}/orders`, payload, {
      headers: { 'X-Skip-Toast': 'true' }
    }).pipe(map((r) => r.data));
  }

  deleteOrder(orderId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/orders/${orderId}`);
  }

  advanceOrder(orderId: string): Observable<Order> {
    return this.http.post<{ data: Order }>(`${this.base}/orders/${orderId}/advance`, {}).pipe(map((r) => r.data));
  }

  patchOrderStatus(orderId: string, status: OrderStatus, idempotencyKey?: string): Observable<Order> {
    return this.http
      .patch<{ data: Order }>(`${this.base}/orders/${orderId}`, { status, idempotencyKey })
      .pipe(map((r) => r.data));
  }

  searchProducts(
    term: string,
    category: string | null,
    limit = 40,
    availableOnly = false,
  ): Observable<{
    products: Product[];
    total: number;
    tookMs: number;
    categories: string[];
  }> {
    let params = new HttpParams().set('q', term).set('limit', limit).set('available', String(availableOnly));
    if (category) params = params.set('category', category);
    return this.http.get<{ products: Product[]; total: number; tookMs: number; categories: string[] }>(
      `${this.base}/products`,
      { params },
    );
  }

  getCategories(): Observable<CategoryRecord[]> {
    return this.http.get<{ data: CategoryRecord[] }>(`${this.base}/categories`).pipe(map((r) => r.data));
  }

  createCategory(name: string): Observable<CategoryRecord> {
    return this.http.post<{ data: CategoryRecord }>(`${this.base}/categories`, { name }).pipe(map((r) => r.data));
  }

  getCategoryById(id: string): Observable<CategoryRecord> {
    return this.http.get<{ data: CategoryRecord }>(`${this.base}/categories/${id}`).pipe(map((r) => r.data));
  }

  updateCategory(id: string, payload: { name: string }): Observable<CategoryRecord> {
    return this.http.patch<{ data: CategoryRecord }>(`${this.base}/categories/${id}`, payload).pipe(map((r) => r.data));
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  createProduct(payload: {
    name: string;
    category: string;
    price: number;
    sku: string;
    tags?: string[];
    available?: boolean;
  }): Observable<Product> {
    return this.http.post<{ data: Product }>(`${this.base}/products`, payload).pipe(map((r) => r.data));
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<{ data: Product }>(`${this.base}/products/${id}`).pipe(map((r) => r.data));
  }

  updateProduct(
    id: string,
    payload: Partial<{
      name: string;
      category: string;
      price: number;
      sku: string;
      tags: string[];
      available: boolean;
    }>,
  ): Observable<Product> {
    return this.http.patch<{ data: Product }>(`${this.base}/products/${id}`, payload).pipe(map((r) => r.data));
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/products/${id}`);
  }

  getKitchen(): Observable<KitchenLoadSnapshot> {
    return this.http.get<{ data: KitchenLoadSnapshot }>(`${this.base}/kitchen`).pipe(map((r) => r.data));
  }

  updateKitchen(snapshot: Omit<KitchenLoadSnapshot, 'updatedAt'>): Observable<KitchenLoadSnapshot> {
    return this.http.put<{ data: KitchenLoadSnapshot }>(`${this.base}/kitchen`, snapshot).pipe(map((r) => r.data));
  }

  getNotifications(): Observable<AppNotification[]> {
    return this.http.get<{ data: AppNotification[] }>(`${this.base}/notifications`).pipe(map((r) => r.data));
  }

  createNotification(payload: {
    title: string;
    body: string;
    severity?: AppNotification['severity'];
  }): Observable<AppNotification> {
    return this.http
      .post<{ data: AppNotification }>(`${this.base}/notifications`, payload)
      .pipe(map((r) => r.data));
  }

  markNotificationRead(id: string): Observable<AppNotification> {
    return this.http
      .patch<{ data: AppNotification }>(`${this.base}/notifications/${id}/read`, {})
      .pipe(map((r) => r.data));
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/notifications/${id}`);
  }

  getUsers(): Observable<AuthUser[]> {
    return this.http.get<{ data: AuthUser[] }>(`${this.base}/users`).pipe(map((r) => r.data));
  }

  getUserById(id: string): Observable<AuthUser> {
    return this.http.get<{ data: AuthUser }>(`${this.base}/users/${id}`).pipe(map((r) => r.data));
  }

  createUser(payload: {
    name: string;
    email: string;
    password: string;
    role: AppRole;
  }): Observable<AuthUser> {
    return this.http.post<{ data: AuthUser }>(`${this.base}/users`, payload).pipe(map((r) => r.data));
  }

  updateUser(id: string, payload: Partial<{ name: string; email: string; role: AppRole }>): Observable<AuthUser> {
    return this.http.patch<{ data: AuthUser }>(`${this.base}/users/${id}`, payload).pipe(map((r) => r.data));
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }
}
