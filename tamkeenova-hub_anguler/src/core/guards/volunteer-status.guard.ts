import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { VolunteersService } from '../services/volunteers.service';

// Volunteers must stay on the status page until the admin approves them.
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
      return router.createUrlTree(['/portal/volunteer/status']);
    }),
    catchError((err) => {
      // 401 is handled by the auth interceptor (logout + redirect).
      if (err?.status === 401) return of(true);
      // Fail open on any other error (missing endpoint / network glitch)
      // to avoid locking volunteers out of their portal.
      return of(true);
    }),
  );
};
