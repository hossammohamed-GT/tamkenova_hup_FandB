import { DOCUMENT } from '@angular/common';
import { environment } from '../../environments/environment';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const doc = inject(DOCUMENT);
  if (!isApiRequest(req.url, environment.apiUrl, doc.baseURI)) return next(req);
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout(false);
        router.navigate(['/login']);
        return throwError(() => error);
      }

      if (error.status === 403 && !req.url.includes('/auth/me') && authService.isLoggedIn()) {
        authService.syncSession().subscribe({
          next: ({ changed, role }) => {
            if (changed) router.navigate([authService.homeRouteForRole(role)]);
          },
          error: () => undefined,
        });
      }
      return throwError(() => error);
    }),
  );
};

export function isApiRequest(requestUrl: string, apiUrl: string, baseUrl: string): boolean {
  try {
    const api = new URL(apiUrl.replace(/\/$/, '') + '/', baseUrl);
    const target = new URL(requestUrl, baseUrl);
    return (
      target.origin === api.origin &&
      (target.pathname === api.pathname.slice(0, -1) || target.pathname.startsWith(api.pathname))
    );
  } catch {
    return false;
  }
}
