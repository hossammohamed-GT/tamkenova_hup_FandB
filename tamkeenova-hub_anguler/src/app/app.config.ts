import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { authInterceptor } from '../core/interceptors/auth.interceptor';
import { loadingInterceptor } from '../core/interceptors/loading.interceptor';
import { routes } from './app.routes';
import { ThemeService } from '../core/services/theme.service';
import { TransitionLinksService } from '../core/services/transition-links.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor])),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'ar',
      lang: 'ar',
    }),
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
    provideAppInitializer(() => {
      inject(TransitionLinksService).init();
    }),
  ],
};
