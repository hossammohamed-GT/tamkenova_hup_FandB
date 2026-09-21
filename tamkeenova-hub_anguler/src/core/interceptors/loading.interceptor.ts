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

  // تجاهل طلبات الخلفية والـ GET لتجنب الوميض الجهنمي
  const shouldIgnore =
    IGNORED_URLS.some((url) => req.url.includes(url)) ||
    req.method === 'GET';

  // فقط POST, PUT, PATCH, DELETE تظهر اللودر - ولفترة قصيرة
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
        // تأخير بسيط لتجنب الوميض السريع
        setTimeout(() => {
          if (activeRequests === 0) loader.hide();
        }, 150);
      }
    }),
  );
};
