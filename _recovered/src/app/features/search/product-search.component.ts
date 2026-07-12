import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ProductSearchStore } from './product-search.store';
import { HighlightMatchPipe } from '../../shared/pipes/highlight-match.pipe';
import { ListKeyNavDirective } from '../../shared/directives/list-key-nav.directive';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { Product } from '../../core/models/product.model';
import { ProductApiService } from '../../core/services/product-api.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    HighlightMatchPipe,
    ListKeyNavDirective,
    SkeletonComponent,
    EmptyStateComponent,
    ScrollingModule,
  ],
  templateUrl: './product-search.component.html',
  styleUrl: './product-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSearchComponent {
  readonly store = inject(ProductSearchStore);
  private readonly productsApi = inject(ProductApiService);
  private readonly auth = inject(AuthService);

  onTermInput(value: string): void {
    this.store.setTerm(value);
  }

  canWrite(): boolean {
    return this.auth.hasPermission('products:write');
  }

  addProduct(): void {
    if (!this.canWrite()) return;
    const n = Math.floor(1000 + Math.random() * 9000);
    this.productsApi
      .createProduct({
        name: `Menu Item ${n}`,
        category: 'Mains',
        price: 85,
        sku: `SKU-${n}`,
      })
      .subscribe({
        next: () => this.store.setTerm(''),
      });
  }

  trackById = (_: number, product: Product): string => product.id;
}
