import { CurrencyPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LocalizedNumberPipe } from '../../shared/pipes/localized-number.pipe';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductSearchStore } from './product-search.store';
import { HighlightMatchPipe } from '../../shared/pipes/highlight-match.pipe';
import { ListKeyNavDirective } from '../../shared/directives/list-key-nav.directive';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { Product } from '../../core/models/product.model';
import { GourmetApiClient } from '../../core/infrastructure/gourmet-api.client';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    HighlightMatchPipe,
    ListKeyNavDirective,
    SkeletonComponent,
    EmptyStateComponent,
    ScrollingModule,
    TranslatePipe,
    LocalizedNumberPipe,
  ],
  templateUrl: './product-search.component.html',
  styleUrl: './product-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSearchComponent implements OnInit {
  readonly store = inject(ProductSearchStore);
  private readonly api = inject(GourmetApiClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = signal<Array<{ id: string; name: string }>>([]);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    category: ['', Validators.required],
    price: [50, [Validators.required, Validators.min(1)]],
    sku: ['', [Validators.required, Validators.minLength(2)]],
    tags: [''],
    available: [true],
  });

  ngOnInit(): void {
    this.api.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cats) => this.categories.set(cats),
      });
  }

  onTermInput(value: string): void {
    this.store.setTerm(value);
  }

  canWrite(): boolean {
    return this.auth.hasPermission('products:write');
  }

  startEdit(product: Product): void {
    if (!this.canWrite()) return;
    this.editingId.set(product.id);
    this.form.setValue({
      name: product.name,
      category: product.category,
      price: product.price,
      sku: product.sku,
      tags: product.tags.join(', '),
      available: product.available,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', category: '', price: 50, sku: '', tags: '', available: true });
  }

  save(): void {
    if (!this.canWrite() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name,
      category: raw.category,
      price: Number(raw.price),
      sku: raw.sku,
      tags: raw.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      available: raw.available,
    };
    const id = this.editingId();
    const req = id ? this.api.updateProduct(id, payload) : this.api.createProduct(payload);
    req
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(id ? 'Product updated' : 'Product created');
          this.cancelEdit();
          this.store.setTerm('');
          this.store.refresh();
        },
        error: () => this.toast.error('Save failed'),
      });
  }

  remove(product: Product): void {
    if (!this.canWrite()) return;
    
    this.dialog.confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      confirmText: 'Delete'
    }).then(confirmed => {
      if (confirmed) {
        this.api.deleteProduct(product.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.success('Product deleted');
              this.store.refresh();
            },
            error: () => this.toast.error('Delete failed'),
          });
      }
    });
  }

  trackById = (_: number, product: Product): string => product.id;
}
