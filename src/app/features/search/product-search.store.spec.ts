import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProductSearchStore } from './product-search.store';
import { ProductApiService } from '../../core/services/product-api.service';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { Product } from '../../core/models/product.model';

describe('ProductSearchStore', () => {
  let searchSpy: jasmine.Spy;

  const burger: Product = {
    id: '1',
    name: 'Burger',
    category: 'Mains',
    price: 100,
    sku: 'SKU-1',
    tags: ['burger'],
    available: true,
  };

  function createStore(): ProductSearchStore {
    searchSpy = jasmine.createSpy('search').and.returnValue(
      of({ products: [burger], total: 1, query: 'bur', tookMs: 12 }),
    );

    TestBed.configureTestingModule({
      providers: [
        ProductSearchStore,
        ConnectivityService,
        {
          provide: ProductApiService,
          useValue: {
            search: searchSpy,
            clearRecent: jasmine.createSpy('clearRecent'),
            recentSearches: signal<string[]>(['burger']),
            categories: signal(['Mains', 'Drinks']),
          },
        },
      ],
    });

    return TestBed.inject(ProductSearchStore);
  }

  it('debounces search input and updates results', fakeAsync(() => {
    const store = createStore();
    tick(280); // constructor initial query
    searchSpy.calls.reset();

    store.setTerm('bur');
    expect(searchSpy).not.toHaveBeenCalled();
    tick(280);
    expect(searchSpy).toHaveBeenCalled();
    expect(store.results()[0].name).toBe('Burger');
  }));

  it('moves keyboard active index', fakeAsync(() => {
    const store = createStore();
    searchSpy.and.returnValue(
      of({
        products: [burger, { ...burger, id: '2', name: 'Bowl' }],
        total: 2,
        query: 'b',
        tookMs: 5,
      }),
    );
    tick(280);
    store.setTerm('b');
    tick(280);
    store.moveActive(1);
    expect(store.state().activeIndex).toBe(1);
  }));

  it('surfaces search errors', fakeAsync(() => {
    const store = createStore();
    tick(280);
    searchSpy.and.returnValue(throwError(() => new Error('Search unavailable while offline')));
    store.setTerm('x');
    tick(280);
    expect(store.state().error).toContain('offline');
  }));
});
