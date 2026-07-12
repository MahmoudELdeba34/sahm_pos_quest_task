import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  readonly floating = input(true);
}
