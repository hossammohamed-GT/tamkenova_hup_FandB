import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// -- Attach Authentication Credentials and Handle Unauthorized Responses --
// A 403 can mean the user's role changed server-side (the API enforces the
// fresh DB role). Re-sync once: if the role changed, jump to the new portal.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
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
