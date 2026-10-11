import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { VolunteersService } from '../services/volunteers.service';

// Block until admin approval
export const volunteerStatusGuard: CanActivateFn = () => {
  const volunteersService = inject(VolunteersService);
  const router = inject(Router);

  if (volunteersService.isApprovedCached) {
    return true;
  }

  return volunteersService.getMyStatus().pipe(
    map((res) => {
      const status = res?.status;
      if (status === 'APPROVED') {
        volunteersService.isApprovedCached = true;
        return true;
      }
      return router.createUrlTree(['/portal/trainee/status']);
    }),
    catchError((err) => {
      // Interceptor handles 401
      if (err?.status === 401) return of(true);
      // Fail open, avoid lockout
      return of(true);
    }),
  );
};
