import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { Product } from '../../core/models/product.model';
import { ProductApiService } from '../../core/services/product-api.service';

export interface SearchUiState {
  readonly term: string;
  readonly category: string | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly results: readonly Product[];
  readonly total: number;
  readonly tookMs: number;
  readonly activeIndex: number;
}

const INITIAL: SearchUiState = {
  term: '',
  category: null,
  loading: false,
  error: null,
  results: [],
  total: 0,
  tookMs: 0,
  activeIndex: -1,
};

@Injectable({ providedIn: 'root' })
export class ProductSearchStore implements OnDestroy {
  private readonly api = inject(ProductApiService);
  private readonly destroy$ = new Subject<void>();
  private readonly query$ = new Subject<{ term: string; category: string | null; force?: boolean }>();

  private readonly stateSignal = signal<SearchUiState>(INITIAL);

  readonly state = this.stateSignal.asReadonly();
  readonly results = computed(() => this.stateSignal().results);
  readonly loading = computed(() => this.stateSignal().loading);
  readonly recentSearches = this.api.recentSearches;
  readonly categories = this.api.categories;
  readonly activeProduct = computed(() => {
    const { results, activeIndex } = this.stateSignal();
    return activeIndex >= 0 ? results[activeIndex] ?? null : null;
  });

  constructor() {
    this.query$
      .pipe(
        debounceTime(280),
        distinctUntilChanged((prev, curr) => !curr.force && prev.term === curr.term && prev.category === curr.category),
        tap(() => this.stateSignal.update((s) => ({ ...s, loading: true, error: null }))),
        switchMap(({ term, category }) =>
          this.api.search({ term, category }).pipe(
            catchError((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Search failed';
              this.stateSignal.update((s) => ({
                ...s,
                loading: false,
                error: message,
                results: [],
                total: 0,
                activeIndex: -1,
              }));
              return of(null);
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.stateSignal.update((s) => ({
          ...s,
          loading: false,
          results: result.products,
          total: result.total,
          tookMs: result.tookMs,
          activeIndex: result.products.length ? 0 : -1,
          error: null,
        }));
      });

    // Initial empty search to populate catalog slice
    this.query$.next({ term: '', category: null });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTerm(term: string): void {
    this.stateSignal.update((s) => ({ ...s, term }));
    this.query$.next({ term, category: this.stateSignal().category });
  }

  setCategory(category: string | null): void {
    this.stateSignal.update((s) => ({ ...s, category }));
    this.query$.next({ term: this.stateSignal().term, category });
  }

  refresh(): void {
    this.query$.next({ term: this.stateSignal().term, category: this.stateSignal().category, force: true });
  }

  applyRecent(term: string): void {
    this.setTerm(term);
  }

  moveActive(delta: number): void {
    const { results, activeIndex } = this.stateSignal();
    if (!results.length) {
      return;
    }
    const next = (activeIndex + delta + results.length) % results.length;
    this.stateSignal.update((s) => ({ ...s, activeIndex: next }));
  }

  clearRecent(): void {
    this.api.clearRecent();
  }
}
