import { ChangeDetectionStrategy, Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppRole, AuthService, AuthUser } from '../../core/auth/auth.service';
import { GourmetApiClient } from '../../core/infrastructure/gourmet-api.client';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPageComponent implements OnInit {
  private readonly api = inject(GourmetApiClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly users = signal<AuthUser[]>([]);
  readonly roles: AppRole[] = ['manager', 'cashier', 'kitchen', 'support'];

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['cashier' as AppRole, Validators.required],
  });

  readonly showPassword = signal(false);

  togglePasswordVisibility(): void {
    this.showPassword.update(s => !s);
  }

  ngOnInit(): void {
    this.reload();
  }

  canWrite(): boolean {
    return this.auth.hasPermission('users:write');
  }

  reload(): void {
    this.api.getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.users.set(data),
        error: () => this.toast.error('Could not load users'),
      });
  }

  create(): void {
    if (!this.canWrite() || this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.api.createUser(this.createForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.createForm.reset({ name: '', email: '', password: '', role: 'cashier' });
          this.reload();
        }
      });
  }

  async changeRole(user: AuthUser, role: string): Promise<void> {
    if (!this.canWrite()) return;
    
    const confirmed = await this.dialog.confirm({
      title: this.translate.instant('DIALOG.CONFIRM_ROLE_CHANGE'),
      message: this.translate.instant('DIALOG.CONFIRM_ROLE_MESSAGE', { name: user.name, role }),
      confirmText: this.translate.instant('DIALOG.CHANGE')
    });
    if (!confirmed) return;

    this.api.updateUser(user.id, { role: role as AppRole })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        }
      });
  }

  async remove(user: AuthUser): Promise<void> {
    if (!this.canWrite()) return;
    if (user.id === this.auth.user()?.id) {
      this.toast.warning(this.translate.instant('TOAST.CANNOT_DELETE_SELF'));
      return;
    }
    
    const confirmed = await this.dialog.confirm({
      title: this.translate.instant('DIALOG.CONFIRM_DELETE'),
      message: this.translate.instant('DIALOG.CONFIRM_DELETE_USER', { name: user.name }),
      intent: 'danger',
      confirmText: this.translate.instant('DIALOG.DELETE')
    });
    if (!confirmed) return;

    this.api.deleteUser(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.users.update((list) => list.filter((u) => u.id !== user.id));
        }
      });
  }
}
