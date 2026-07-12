import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppRole, AuthService } from '../../core/auth/auth.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly mode = signal<AuthMode>('login');

  readonly roles: { value: AppRole; label: string }[] = [
    { value: 'manager', label: 'Manager' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'support', label: 'Support' },
  ];

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['cashier' as AppRole, Validators.required],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set(null);
    this.form.reset({
      name: '',
      email: '',
      password: '',
      role: 'cashier',
    });
  }

  submit(): void {
    if (this.loading()) return;

    if (this.mode() === 'register') {
      this.form.controls.name.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      this.form.controls.name.clearValidators();
    }
    this.form.controls.name.updateValueAndValidity({ emitEvent: false });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const { email, password, name, role } = this.form.getRawValue();

    const request$ =
      this.mode() === 'register'
        ? this.auth.register({ email, password, name, role })
        : this.auth.login(email, password);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err: { status?: number }) => {
        this.loading.set(false);
        if (err.status === 0) {
          this.error.set('Cannot connect to the server. Is the backend running?');
          return;
        }
        if (this.mode() === 'register' && err.status === 409) {
          this.error.set('This email is already registered. Sign in instead.');
          return;
        }
        this.error.set(
          this.mode() === 'register'
            ? 'Could not create account. Check the form and try again.'
            : 'Invalid credentials. Create an account first.',
        );
      },
    });
  }
}
