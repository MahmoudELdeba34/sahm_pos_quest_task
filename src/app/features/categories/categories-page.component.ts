import { ChangeDetectionStrategy, Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CategoryRecord, GourmetApiClient } from '../../core/infrastructure/gourmet-api.client';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPageComponent implements OnInit {
  private readonly api = inject(GourmetApiClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly categories = signal<CategoryRecord[]>([]);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit(): void {
    this.reload();
  }

  canWrite(): boolean {
    return this.auth.hasPermission('categories:write');
  }

  reload(): void {
    this.api.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.categories.set(data),
        error: () => this.toast.error('Could not load categories'),
      });
  }

  create(): void {
    if (!this.canWrite() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.api.createCategory(this.form.controls.name.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cat) => {
          this.categories.update((list) => [...list, cat].sort((a, b) => a.name.localeCompare(b.name)));
          this.form.reset({ name: '' });
        }
      });
  }

  async remove(cat: CategoryRecord): Promise<void> {
    if (!this.canWrite()) return;
    
    const confirmed = await this.dialog.confirm({
      title: this.translate.instant('DIALOG.CONFIRM_DELETE'),
      message: this.translate.instant('DIALOG.CONFIRM_DELETE_CATEGORY', { name: cat.name }),
      intent: 'danger',
      confirmText: this.translate.instant('DIALOG.DELETE')
    });
    if (!confirmed) return;

    this.api.deleteCategory(cat.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.categories.update((list) => list.filter((c) => c.id !== cat.id));
        }
      });
  }
}
