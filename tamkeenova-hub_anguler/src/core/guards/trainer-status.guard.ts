import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { TrainerService } from '../services/trainer.service';

export const trainerStatusGuard: CanActivateFn = (route) => {
  const trainerService = inject(TrainerService);
  const router = inject(Router);

  // ✅ لو الحالة محفوظة في الـ cache (APPROVED)
  if (trainerService.isApprovedCached) {
    return true;
  }

  return trainerService.getApplicationStatus().pipe(
    map((res) => {
      const status = res.data?.status ?? (res as any).status;
      // ✅ لو معتمد، يدخل عادي
      if (status === 'APPROVED') {
        return true;
      }
      // ✅ لو مش معتمد (PENDING أو REJECTED)، يروح لصفحة الحالة
      console.log(`🚫 Trainer status: ${status} - Redirecting to status page`);
      return router.createUrlTree(['/portal/trainer/status']);
    }),
    catchError((err) => {
      console.error('❌ Error checking trainer status:', err);
      // على خطأ شبكة أو 401، اسمح بالدخول لتجنب loop جهنمي كل ثانية
      // authInterceptor سيتولى الـ logout لو 401
      if (err?.status === 401) {
        return of(true);
      }
      // لو خطأ آخر، اسمح بالدخول مع تحذير لتجنب loop
      return of(true);
    }),
  );
};
