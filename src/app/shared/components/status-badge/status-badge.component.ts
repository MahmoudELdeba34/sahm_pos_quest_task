import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge" [attr.data-tone]="tone">{{ label }}</span>
  `,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        background: var(--badge-bg, #e8eeea);
        color: var(--badge-fg, #1f3d2f);
      }
      .badge[data-tone='success'] { --badge-bg: #d9f2e3; --badge-fg: #0f5c38; }
      .badge[data-tone='warning'] { --badge-bg: #fff0c9; --badge-fg: #7a5300; }
      .badge[data-tone='danger'] { --badge-bg: #ffe0dc; --badge-fg: #8b1e12; }
      .badge[data-tone='info'] { --badge-bg: #dcecff; --badge-fg: #0d4a8c; }
      .badge[data-tone='neutral'] { --badge-bg: #e8ece9; --badge-fg: #3d4a42; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  @Input({ required: true }) label!: string;
  @Input() tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
}
