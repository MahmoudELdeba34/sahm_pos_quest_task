import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OrdersWorkspaceComponent } from '../orders/orders-workspace.component';
import { AiAssistantPanelComponent } from '../ai-assistant/ai-assistant-panel.component';
import { KitchenLoadMonitorComponent } from '../kitchen/kitchen-load-monitor.component';
import { ProductSearchComponent } from '../search/product-search.component';
import { OfflinePanelComponent } from '../offline/offline-panel.component';
import { AuthService } from '../../core/auth/auth.service';
import { DeveloperPanelComponent } from '../dev/developer-panel/developer-panel.component';
import { ExecDashboardComponent } from '../dashboard/exec-dashboard.component';

@Component({
  selector: 'app-smart-workspace',
  standalone: true,
  imports: [
    OrdersWorkspaceComponent,
    AiAssistantPanelComponent,
    KitchenLoadMonitorComponent,
    ProductSearchComponent,
    OfflinePanelComponent,
    DeveloperPanelComponent,
    ExecDashboardComponent,
  ],
  templateUrl: './smart-workspace.component.html',
  styleUrl: './smart-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartWorkspaceComponent {
  private readonly auth = inject(AuthService);

  readonly isCashier = this.auth.isCashier;
  readonly isManager = this.auth.isManager;
  readonly isKitchen = this.auth.isKitchen;
  readonly isSupport = this.auth.isSupport;
}
