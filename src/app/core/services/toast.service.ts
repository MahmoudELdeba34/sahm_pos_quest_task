import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  readonly id: string;
  readonly kind: ToastKind;
  readonly title: string;
  readonly detail?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  success(title: string, detail?: string): void {
    this.push('success', title, detail);
  }

  error(title: string, detail?: string): void {
    this.push('error', title, detail);
  }

  info(title: string, detail?: string): void {
    this.push('info', title, detail);
  }

  warning(title: string, detail?: string): void {
    this.push('warning', title, detail);
  }

  dismiss(id: string): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, title: string, detail?: string): void {
    const id = crypto.randomUUID();
    this.toastsSignal.update((list) => [...list, { id, kind, title, detail }]);
    window.setTimeout(() => this.dismiss(id), 4200);
  }
}
