import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss'
})
export class DrawerComponent {
  @Input() title = '';
  @Input() isOpen = false;
  @Output() closeDrawer = new EventEmitter<void>();

  onClose() {
    this.isOpen = false;
    this.closeDrawer.emit();
  }
}
