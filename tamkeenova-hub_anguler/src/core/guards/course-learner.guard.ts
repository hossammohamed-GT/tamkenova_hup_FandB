import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { courseManagementRoute } from '../utils/course-role';

export const courseLearnerGuard: CanActivateFn = () => {
  const auth = inject(AuthService),
    router = inject(Router);
  return auth.syncSession().pipe(
    map((user) => {
      const destination = courseManagementRoute(user.role);
      return destination ? router.createUrlTree([destination]) : true;
    }),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
