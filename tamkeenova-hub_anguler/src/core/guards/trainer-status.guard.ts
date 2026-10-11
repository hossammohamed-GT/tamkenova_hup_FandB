import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { TrainerService } from '../services/trainer.service';

export const trainerStatusGuard: CanActivateFn = (route) => {
  const trainerService = inject(TrainerService);
  const router = inject(Router);

  // Cached approval
  if (trainerService.isApprovedCached) {
    return true;
  }

  return trainerService.getApplicationStatus().pipe(
    map((res) => {
      const status = res.data?.status ?? (res as any).status;
      if (status === 'APPROVED') {
        return true;
      }
      console.log(`Trainer status: ${status}, redirecting`);
      return router.createUrlTree(['/portal/trainer/status']);
    }),
    catchError((err) => {
      console.error('Error checking trainer status:', err);
      // Interceptor handles 401
      if (err?.status === 401) {
        return of(true);
      }
      // Fail open, avoid lockout
      return of(true);
    }),
  );
};
