import { Component, ChangeDetectionStrategy, computed, effect, inject, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopBarComponent } from './shared/components/top-bar/top-bar.component';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { SideNavComponent } from './shared/components/side-nav/side-nav.component';
import { ToasterComponent } from './shared/components/toaster/toaster.component';
import { AuthService } from './core/auth/auth.service';
import { NotificationsService } from './core/services/notifications.service';
import { RealtimeGatewayService } from './core/services/realtime-gateway.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopBarComponent, CommandPaletteComponent, SideNavComponent, ToasterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationsService);
  private readonly gateway = inject(RealtimeGatewayService);
  private readonly translate = inject(TranslateService);
  readonly palette = viewChild(CommandPaletteComponent);
  readonly showChrome = computed(() => this.auth.isAuthenticated());

  constructor() {
    this.translate.onLangChange.subscribe(event => {
      document.dir = event.lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = event.lang;
    });

    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.notifications.hydrate();
        this.gateway.hydrateFromApi();
      }
    });
  }

  openPalette(): void {
    this.palette()?.show();
  }
}
