import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  intent?: 'danger' | 'primary' | 'warning';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="dialog-container">
      <div class="dialog-header" [attr.data-intent]="data.intent || 'primary'">
        <span class="material-symbols-outlined icon">
          {{ getIcon() }}
        </span>
        <h2 class="dialog-title">{{ data.title }}</h2>
      </div>
      <div class="dialog-content">
        <p>{{ data.message }}</p>
      </div>
      <div class="dialog-actions">
        <button type="button" class="btn btn-outline" (click)="dialogRef.close(false)">
          {{ data.cancelText || ('DIALOG.CANCEL' | translate) }}
        </button>
        <button type="button" class="btn btn-filled" [attr.data-intent]="data.intent || 'primary'" (click)="dialogRef.close(true)">
          {{ data.confirmText || ('DIALOG.CONFIRM' | translate) }}
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: var(--gos-surface, #fff);
      border-radius: var(--gos-radius-lg, 12px);
      box-shadow: var(--gos-shadow-lg, 0 8px 24px rgba(0,0,0,0.12));
      overflow: hidden;
      width: 400px;
      max-width: 90vw;
      border: 1px solid var(--gos-outline-variant, #e0e0e0);
      font-family: inherit;
    }
    
    .dialog-container {
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      padding: 24px 24px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .dialog-header .icon {
      font-size: 28px;
    }

    .dialog-header[data-intent="danger"] { color: var(--gos-error, #d32f2f); }
    .dialog-header[data-intent="warning"] { color: var(--gos-warning, #ed6c02); }
    .dialog-header[data-intent="primary"] { color: var(--gos-primary, #1976d2); }

    .dialog-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--gos-on-surface, #1e1e1e);
    }

    .dialog-content {
      padding: 0 24px 24px;
      font-size: 1rem;
      line-height: 1.5;
      color: var(--gos-on-surface-variant, #4a4a4a);
    }

    .dialog-content p {
      margin: 0;
    }

    .dialog-actions {
      padding: 16px 24px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: var(--gos-surface-container-lowest, #fafafa);
      border-top: 1px solid var(--gos-outline-variant, #e0e0e0);
    }

    .btn {
      padding: 8px 16px;
      border-radius: var(--gos-radius-sm, 6px);
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      font-family: inherit;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--gos-outline, #bdbdbd);
      color: var(--gos-on-surface, #1e1e1e);
    }

    .btn-outline:hover {
      background: var(--gos-surface-container-low, #f5f5f5);
    }

    .btn-filled {
      background: var(--gos-primary, #1976d2);
      color: var(--gos-on-primary, #fff);
    }

    .btn-filled[data-intent="danger"] {
      background: var(--gos-error, #d32f2f);
      color: var(--gos-on-error, #fff);
    }
    
    .btn-filled[data-intent="warning"] {
      background: var(--gos-warning, #ed6c02);
      color: var(--gos-on-warning, #fff);
    }

    .btn-filled:hover {
      filter: brightness(0.9);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<ConfirmDialogData>(DIALOG_DATA);

  getIcon(): string {
    switch (this.data.intent) {
      case 'danger': return 'warning';
      case 'warning': return 'error_outline';
      default: return 'help_outline';
    }
  }
}
