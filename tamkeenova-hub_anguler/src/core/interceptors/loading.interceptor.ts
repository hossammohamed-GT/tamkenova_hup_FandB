import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

let activeRequests = 0;
const IGNORED_URLS = [
  '/notifications/unread-count',
  '/notifications',
  '/application-status',
  '/dashboard',
  '/trainers/me',
  '/students/profile',
  '/students/trainers',
  '/students/programs',
  '/trainers/programs',
  '/auth/me',
  '/specializations',
];

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoaderService);


  const shouldIgnore =
    IGNORED_URLS.some((url) => req.url.includes(url)) ||
    req.method === 'GET';

  if (shouldIgnore) {
    return next(req);
  }

  activeRequests++;
  loader.show();

  return next(req).pipe(
    finalize(() => {
      activeRequests--;
      if (activeRequests <= 0) {
        activeRequests = 0;

        setTimeout(() => {
          if (activeRequests === 0) loader.hide();
        }, 150);
      }
    }),
  );
};
