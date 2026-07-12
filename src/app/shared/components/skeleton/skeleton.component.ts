import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="skeleton" [style.height]="height" [style.width]="width" [attr.aria-hidden]="true"></div>
  `,
  styles: [
    `
      .skeleton {
        border-radius: 8px;
        background: linear-gradient(90deg, #e8ece9 25%, #f4f7f5 37%, #e8ece9 63%);
        background-size: 400% 100%;
        animation: shimmer 1.2s ease-in-out infinite;
      }
      @keyframes shimmer {
        0% { background-position: 100% 0; }
        100% { background-position: 0 0; }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  @Input() height = '1rem';
  @Input() width = '100%';
}
