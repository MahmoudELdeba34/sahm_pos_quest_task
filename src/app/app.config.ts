import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { apiFeedbackInterceptor } from './core/interceptors/api-feedback.interceptor';
import { GlobalErrorHandler } from './core/errors/global-error.handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor, apiFeedbackInterceptor])),
    provideTranslateService({
      fallbackLang: 'en',
      lang: 'en'
    }),
    provideTranslateHttpLoader({
      prefix: '/assets/i18n/',
      suffix: '.json'
    }),
    provideCharts(withDefaultRegisterables()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
