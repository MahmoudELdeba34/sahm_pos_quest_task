import { ChangeDetectionStrategy, Component, HostListener, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteComponent {
  readonly open = signal(false);
  readonly closed = output<void>();

  show(): void {
    this.open.set(true);
  }

  hide(): void {
    this.open.set(false);
    this.closed.emit();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.open()) {
        this.hide();
      } else {
        this.show();
      }
    }
    if (event.key === 'Escape' && this.open()) {
      this.hide();
    }
  }
}
