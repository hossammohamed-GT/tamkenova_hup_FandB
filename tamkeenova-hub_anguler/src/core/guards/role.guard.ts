import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

// -- Restrict a Route to the Allowed User Roles --
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.role();

    if (!role) {
      router.navigate(['/login']);
      return false;
    }

    if (!allowedRoles.includes(role)) {
      router.navigate(['/']);
      return false;
    }

    return true;
  };
}
