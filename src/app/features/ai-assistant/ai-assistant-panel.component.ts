import { DecimalPipe, CurrencyPipe, PercentPipe, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AiAssistantStore } from './ai-assistant.store';
import { OrdersStore } from '../orders/orders.store';
import { KitchenStore } from '../kitchen/kitchen.store';
import { AiSuggestionType } from '../../core/models/ai-assistant.model';

@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [DecimalPipe, CurrencyPipe, PercentPipe, NgClass, TranslatePipe],
  templateUrl: './ai-assistant-panel.component.html',
  styleUrl: './ai-assistant-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantPanelComponent {
  readonly store = inject(AiAssistantStore);
  readonly orders = inject(OrdersStore);
  readonly kitchen = inject(KitchenStore);

  toneFor(type: AiSuggestionType): string {
    return type;
  }
}
