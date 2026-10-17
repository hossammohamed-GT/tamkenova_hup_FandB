import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { courseLearnerGuard } from './course-learner.guard';
import { courseManagementRoute } from '../utils/course-role';
describe('Course learner role gate', () => {
  for (const role of [
    'ADMIN',
    'SUPER_ADMIN',
    'TRAINER',
    'STUDENT',
    'CLIENT',
    'EMPLOYEE',
    'VOLUNTEER',
  ]) {
    it(`uses current server role, not cached learner role: ${role}`, async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: AuthService,
            useValue: { role: () => 'STUDENT', syncSession: () => of({ role }) },
          },
        ],
      });
      const result = TestBed.runInInjectionContext(() => courseLearnerGuard({} as any, {} as any));
      const actual = isObservable(result) ? await firstValueFrom(result) : result;
      const route = courseManagementRoute(role);
      if (route) expect(TestBed.inject(Router).serializeUrl(actual as any)).toBe(route);
      else expect(actual).toBe(true);
    });
  }
  it('fails closed to login when session validation fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { syncSession: () => throwError(() => new Error('session expired')) },
        },
      ],
    });
    const result = TestBed.runInInjectionContext(() => courseLearnerGuard({} as any, {} as any));
    expect(TestBed.inject(Router).serializeUrl((await firstValueFrom(result as any)) as any)).toBe(
      '/login',
    );
  });
});
