import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { Product, ProductSearchResult } from '../models/product.model';
import { ConnectivityService } from './connectivity.service';
import { GourmetApiClient } from '../infrastructure/gourmet-api.client';

export interface ProductSearchQuery {
  readonly term: string;
  readonly category: string | null;
  readonly limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly connectivity = inject(ConnectivityService);
  private readonly api = inject(GourmetApiClient);
  private readonly recentSignal = signal<string[]>(this.readRecent());
  private readonly categoriesSignal = signal<string[]>([]);

  readonly recentSearches = this.recentSignal.asReadonly();
  readonly categories = computed(() => this.categoriesSignal());

  constructor() {
    this.refreshCategories();
  }

  refreshCategories(): void {
    if (!this.connectivity.online()) return;
    this.api.getCategories().subscribe({
      next: (rows) => this.categoriesSignal.set(rows.map((r) => r.name)),
      error: () => this.categoriesSignal.set([]),
    });
  }

  search(query: ProductSearchQuery): Observable<ProductSearchResult> {
    if (!this.connectivity.online()) {
      return throwError(() => new Error('Search unavailable while offline'));
    }

    return this.api.searchProducts(query.term, query.category, query.limit ?? 40).pipe(
      map((result) => {
        if (result.categories?.length) {
          this.categoriesSignal.set(result.categories);
        }
        if (query.term.trim()) {
          this.pushRecent(query.term.trim().toLowerCase());
        }
        return {
          products: result.products,
          total: result.total,
          query: query.term,
          tookMs: result.tookMs,
        } satisfies ProductSearchResult;
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  createProduct(payload: {
    name: string;
    category: string;
    price: number;
    sku: string;
  }): Observable<Product> {
    return this.api.createProduct(payload).pipe(
      map((product) => {
        this.refreshCategories();
        return product;
      }),
    );
  }

  clearRecent(): void {
    this.recentSignal.set([]);
    localStorage.removeItem('sahm.pos.recent-searches');
  }

  private pushRecent(term: string): void {
    const next = [term, ...this.recentSignal().filter((item) => item !== term)].slice(0, 8);
    this.recentSignal.set(next);
    localStorage.setItem('sahm.pos.recent-searches', JSON.stringify(next));
  }

  private readRecent(): string[] {
    try {
      const raw = localStorage.getItem('sahm.pos.recent-searches');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}
