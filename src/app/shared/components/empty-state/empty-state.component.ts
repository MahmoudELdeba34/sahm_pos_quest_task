import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty" role="status">
      <p class="empty__title">{{ title }}</p>
      @if (message) {
        <p class="empty__message">{{ message }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: [
    `
      .empty {
        padding: 1.5rem;
        text-align: center;
        color: var(--color-muted);
      }
      .empty__title {
        margin: 0 0 0.35rem;
        font-family: var(--font-display);
        color: var(--color-ink);
        font-size: 1.05rem;
      }
      .empty__message {
        margin: 0;
        font-size: 0.9rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() message = '';
}
