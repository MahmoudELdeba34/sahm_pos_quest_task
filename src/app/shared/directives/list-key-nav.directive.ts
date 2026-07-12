import { Directive, ElementRef, HostListener, inject, input, output } from '@angular/core';

/**
 * Enables arrow-key navigation for listbox-style widgets.
 */
@Directive({
  selector: '[appListKeyNav]',
  standalone: true,
})
export class ListKeyNavDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly itemCount = input(0);
  readonly move = output<number>();
  readonly activate = output<void>();

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.itemCount() <= 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.move.emit(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.move.emit(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.activate.emit();
    }
  }
}
