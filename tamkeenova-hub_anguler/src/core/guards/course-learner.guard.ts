import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
/** Trainers author courses; they do not enter the learner checkout/library journey. */
export const courseLearnerGuard: CanActivateFn = () =>
  inject(AuthService).role() === 'TRAINER'
    ? inject(Router).createUrlTree(['/portal/trainer/courses'])
    : true;
