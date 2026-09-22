import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

// -- Restrict a Route to the Allowed User Roles --
// Verifies the role against the server on every navigation, so an admin-side
// role change takes effect immediately instead of lingering in localStorage.
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.getToken() || !authService.currentUser()) {
      router.navigate(['/login']);
      return false;
    }

    return authService.syncSession().pipe(
      map(({ role }) => {
        if (!role || !allowedRoles.includes(role)) {
          router.navigate(['/']);
          return false;
        }
        return true;
      }),
      catchError(() => {
        router.navigate(['/login']);
        return of(false);
      }),
    );
  };
}
