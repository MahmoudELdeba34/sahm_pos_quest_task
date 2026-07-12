import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toaster',
  standalone: true,
  template: `
    <div class="toaster" aria-live="polite" aria-relevant="additions">
      @for (toast of toast.toasts(); track toast.id) {
        <article class="toast" [attr.data-kind]="toast.kind" role="status">
          <div class="toast-icon-wrapper">
            <span class="material-symbols-outlined toast-icon">
              {{ getIcon(toast) }}
            </span>
          </div>
          <div class="toast-content">
            <strong>{{ toast.title }}</strong>
            @if (toast.detail) {
              <p>{{ toast.detail }}</p>
            }
          </div>
          <button type="button" class="toast-close-btn" (click)="toastSvc.dismiss(toast.id)" aria-label="Dismiss">
            <span class="material-symbols-outlined">close</span>
          </button>
          
          <!-- Progress bar for auto-dismiss -->
          <div class="toast-progress"></div>
        </article>
      }
    </div>
  `,
  styles: `
    .toaster {
      position: fixed;
      z-index: 9999;
      right: 24px;
      bottom: 24px;
      display: grid;
      gap: 12px;
      width: min(380px, calc(100vw - 48px));
      pointer-events: none;
    }
    
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: var(--gos-radius-lg, 12px);
      border: 1px solid var(--gos-outline-variant, #e0e0e0);
      background: var(--gos-surface, #ffffff);
      box-shadow: var(--gos-shadow-lg, 0 8px 24px rgba(0,0,0,0.12));
      animation: toast-enter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      position: relative;
      overflow: hidden;
      font-family: inherit;
    }

    @keyframes toast-enter {
      from { opacity: 0; transform: translateX(100%) scale(0.9); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }

    .toast-icon-wrapper {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
    }
    
    .toast-icon {
      font-size: 20px;
    }

    .toast-content {
      flex: 1;
      min-width: 0;
      padding-top: 2px;
    }

    .toast-content strong {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--gos-on-surface, #1e1e1e);
      margin-bottom: 4px;
    }

    .toast-content p {
      margin: 0;
      font-size: 13px;
      color: var(--gos-on-surface-variant, #4a4a4a);
      line-height: 1.4;
    }

    .toast-close-btn {
      flex-shrink: 0;
      border: 0;
      background: transparent;
      color: var(--gos-on-surface-variant, #757575);
      cursor: pointer;
      height: 28px;
      width: 28px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      transition: background 0.2s;
    }
    
    .toast-close-btn:hover {
      background: var(--gos-surface-container-high, #e0e0e0);
      color: var(--gos-on-surface, #1e1e1e);
    }

    .toast-close-btn .material-symbols-outlined {
      font-size: 18px;
    }
    
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 4px;
      background: currentColor;
      animation: toast-progress 4.2s linear forwards;
      opacity: 0.3;
    }

    @keyframes toast-progress {
      from { width: 100%; }
      to { width: 0%; }
    }

    /* Success Toast */
    .toast[data-kind='success'] { border-left: 6px solid var(--gos-success, #2e7d32); }
    .toast[data-kind='success'] .toast-icon-wrapper { background: color-mix(in srgb, var(--gos-success, #2e7d32) 15%, transparent); color: var(--gos-success, #2e7d32); }
    .toast[data-kind='success'] .toast-progress { background: var(--gos-success, #2e7d32); }

    /* Error Toast */
    .toast[data-kind='error'] { border-left: 6px solid var(--gos-error, #d32f2f); }
    .toast[data-kind='error'] .toast-icon-wrapper { background: color-mix(in srgb, var(--gos-error, #d32f2f) 15%, transparent); color: var(--gos-error, #d32f2f); }
    .toast[data-kind='error'] .toast-progress { background: var(--gos-error, #d32f2f); }

    /* Warning Toast */
    .toast[data-kind='warning'] { border-left: 6px solid var(--gos-warning, #ed6c02); }
    .toast[data-kind='warning'] .toast-icon-wrapper { background: color-mix(in srgb, var(--gos-warning, #ed6c02) 15%, transparent); color: var(--gos-warning, #ed6c02); }
    .toast[data-kind='warning'] .toast-progress { background: var(--gos-warning, #ed6c02); }

    /* Info Toast */
    .toast[data-kind='info'] { border-left: 6px solid var(--gos-primary, #1976d2); }
    .toast[data-kind='info'] .toast-icon-wrapper { background: color-mix(in srgb, var(--gos-primary, #1976d2) 15%, transparent); color: var(--gos-primary, #1976d2); }
    .toast[data-kind='info'] .toast-progress { background: var(--gos-primary, #1976d2); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToasterComponent {
  readonly toast = inject(ToastService);
  readonly toastSvc = this.toast;

  getIcon(toast: ToastMessage): string {
    switch (toast.kind) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }
}
