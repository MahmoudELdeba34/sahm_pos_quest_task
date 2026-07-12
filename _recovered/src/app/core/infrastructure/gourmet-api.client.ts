import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderStatus } from '../models/order.model';
import { Product } from '../models/product.model';
import { KitchenLoadSnapshot } from '../models/kitchen.model';

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

@Injectable({ providedIn: 'root' })
export class GourmetApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getOrders(): Observable<Order[]> {
    return this.http.get<{ data: Order[] }>(`${this.base}/orders`).pipe(map((r) => r.data));
  }

  createOrder(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<{ data: Order }>(`${this.base}/orders`, payload).pipe(map((r) => r.data));
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

  searchProducts(term: string, category: string | null, limit = 40): Observable<{
    products: Product[];
    total: number;
    tookMs: number;
    categories: string[];
  }> {
    let params = new HttpParams().set('q', term).set('limit', limit);
    if (category) params = params.set('category', category);
    return this.http.get<{ products: Product[]; total: number; tookMs: number; categories: string[] }>(
      `${this.base}/products`,
      { params },
    );
  }

  getCategories(): Observable<Array<{ id: string; name: string }>> {
    return this.http
      .get<{ data: Array<{ id: string; name: string }> }>(`${this.base}/categories`)
      .pipe(map((r) => r.data));
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

  getKitchen(): Observable<KitchenLoadSnapshot> {
    return this.http.get<{ data: KitchenLoadSnapshot }>(`${this.base}/kitchen`).pipe(map((r) => r.data));
  }

  updateKitchen(snapshot: Omit<KitchenLoadSnapshot, 'updatedAt'>): Observable<KitchenLoadSnapshot> {
    return this.http.put<{ data: KitchenLoadSnapshot }>(`${this.base}/kitchen`, snapshot).pipe(map((r) => r.data));
  }
}
