import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-developer-panel',
  standalone: true,
  imports: [],
  templateUrl: './developer-panel.component.html',
  styleUrl: './developer-panel.component.scss'
})
export class DeveloperPanelComponent {
  private readonly http = inject(HttpClient);
  readonly isDevMode = signal(false);

  toggleDevMode() {
    this.isDevMode.update(v => !v);
  }

  generateOrders(count: number) {
    this.http.post(`${environment.apiBaseUrl}/dev/generate-orders?count=${count}`, {}).subscribe();
  }

  triggerKitchenRush() {
    this.http.post(`${environment.apiBaseUrl}/dev/kitchen-rush`, {}).subscribe();
  }
}
