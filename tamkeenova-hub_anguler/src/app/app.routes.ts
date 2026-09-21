import { Routes } from '@angular/router';
import { HomeComponent } from '../features/home/home.component';
import { NotFoundComponent } from '../features/not-found/not-found.component.js';
import { guestGuard } from '../core/guards/guest.guard';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { trainerStatusGuard } from '../core/guards/trainer-status.guard';
import { volunteerStatusGuard } from '../core/guards/volunteer-status.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'programs',
    loadComponent: () =>
      import('../features/programs/programs.component').then((m) => m.ProgramsComponent),
  },
  {
    path: 'consulting',
    loadComponent: () =>
      import('../features/consulting/consulting.component').then((m) => m.ConsultingComponent),
  },
  {
    path: 'team',
    loadComponent: () => import('../features/team/team.component').then((m) => m.TeamComponent),
  },
  {
    path: 'gallery',
    loadComponent: () =>
      import('../features/gallery-showcase/gallery-showcase.component').then(
        (m) => m.GalleryShowcaseComponent,
      ),
  },

  // -- Authentication Routes --
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'register/trainer',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/register-trainer/trainer-register.component').then(
        (m) => m.TrainerRegisterComponent,
      ),
  },
  {
    path: 'register/volunteer',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/register-volunteer/volunteer-register.component').then(
        (m) => m.VolunteerRegisterComponent,
      ),
  },
  {
    path: 'verify-otp',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/verify-otp/verify-otp.component').then((m) => m.VerifyOtpComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // -- Student Portal Routes --
  {
    path: 'portal',
    // Redirects happen before guards, so the role lookup reads the stored session
    // directly instead of combining redirectTo with canActivate (invalid config).
    redirectTo: () => {
      try {
        if (typeof localStorage === 'undefined') return '/login';
        const token = localStorage.getItem('token');
        const raw = localStorage.getItem('user');
        if (!token || !raw) return '/login';
        const role = (JSON.parse(raw) as { role?: string }).role;
        if (role === 'TRAINER') return '/portal/trainer';
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/portal/admin';
        if (role === 'EMPLOYEE') return '/portal/employee';
        if (role === 'VOLUNTEER') return '/portal/volunteer';
        return '/portal/student';
      } catch {
        return '/login';
      }
    },
    pathMatch: 'full',
  },
  {
    path: 'portal/student',
    canActivate: [authGuard, roleGuard(['STUDENT'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../features/portal/student/dashboard/student-dashboard.component').then(
            (m) => m.StudentDashboardComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../features/portal/student/profile/student-profile.component').then(
            (m) => m.StudentProfileComponent,
          ),
      },
      {
        path: 'enrollments',
        loadComponent: () =>
          import('../features/portal/student/enrollments/student-enrollments.component').then(
            (m) => m.StudentEnrollmentsComponent,
          ),
      },
      {
        path: 'consultations',
        loadComponent: () =>
          import(
            '../features/portal/student/consultations/student-consultations.component'
          ).then((m) => m.StudentConsultationsComponent),
      },
      {
        path: 'certificates',
        loadComponent: () =>
          import(
            '../features/portal/student/certificates/student-certificates.component'
          ).then((m) => m.StudentCertificatesComponent),
      },
      {
        path: 'corporate-requests',
        loadComponent: () =>
          import(
            '../features/portal/student/corporate-requests/student-corporate-requests.component'
          ).then((m) => m.StudentCorporateRequestsComponent),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('../features/portal/student/reviews/student-reviews.component').then(
            (m) => m.StudentReviewsComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import(
            '../features/portal/student/notifications/student-notifications.component'
          ).then((m) => m.StudentNotificationsComponent),
      },
      {
        path: 'trainers',
        loadComponent: () =>
          import('../features/portal/student/trainers/student-trainers.component').then(
            (m) => m.StudentTrainersComponent,
          ),
      },
    ],
  },

  // -- Trainer Portal Routes --
  {
    path: 'portal/trainer',
    canActivate: [authGuard, roleGuard(['TRAINER'])],
    children: [
      {
        path: '',
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/dashboard/trainer-dashboard.component').then(
            (m) => m.TrainerDashboardComponent,
          ),
      },
      {
        path: 'status',
        loadComponent: () =>
          import('../features/portal/trainer/status/trainer-status.component').then(
            (m) => m.TrainerStatusComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../features/portal/trainer/profile/trainer-profile.component').then(
            (m) => m.TrainerProfileComponent,
          ),
      },
      {
        path: 'programs',
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/programs/trainer-programs.component').then(
            (m) => m.TrainerProgramsComponent,
          ),
      },
      {
        path: 'availability',
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/availability/trainer-availability.component').then(
            (m) => m.TrainerAvailabilityComponent,
          ),
      },
      {
        path: 'consultations',
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/consultations/trainer-consultations.component').then(
            (m) => m.TrainerConsultationsComponent,
          ),
      },
      {
        path: 'reviews',
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/reviews/trainer-reviews.component').then(
            (m) => m.TrainerReviewsComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import(
            '../features/portal/student/notifications/student-notifications.component'
          ).then((m) => m.StudentNotificationsComponent),
      },
    ],
  },

  // -- Admin Portal Routes --
  {
    path: 'portal/admin',
    canActivate: [authGuard, roleGuard(['ADMIN', 'SUPER_ADMIN'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../features/portal/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('../features/portal/admin/users/admin-users.component').then(
            (m) => m.AdminUsersComponent,
          ),
      },
      {
        path: 'trainers',
        loadComponent: () =>
          import('../features/portal/admin/trainers/admin-trainers.component').then(
            (m) => m.AdminTrainersComponent,
          ),
      },
      {
        path: 'volunteers',
        loadComponent: () =>
          import('../features/portal/admin/volunteers/admin-volunteers.component').then(
            (m) => m.AdminVolunteersComponent,
          ),
      },
      {
        path: 'certificates',
        loadComponent: () =>
          import('../features/portal/admin/certificates/admin-certificates.component').then(
            (m) => m.AdminCertificatesComponent,
          ),
      },
      {
        path: 'corporate',
        loadComponent: () =>
          import('../features/portal/admin/corporate/admin-corporate.component').then(
            (m) => m.AdminCorporateComponent,
          ),
      },
      {
        path: 'specializations',
        loadComponent: () =>
          import('../features/portal/admin/specializations/admin-specializations.component').then(
            (m) => m.AdminSpecializationsComponent,
          ),
      },
      {
        path: 'programs',
        loadComponent: () =>
          import('../features/portal/admin/programs/admin-programs.component').then(
            (m) => m.AdminProgramsComponent,
          ),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('../features/portal/admin/tasks/admin-tasks.component').then(
            (m) => m.AdminTasksComponent,
          ),
      },
    ],
  },

  // -- Employee Portal Routes --
  {
    path: 'portal/employee',
    canActivate: [authGuard, roleGuard(['EMPLOYEE'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../features/portal/employee/dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
          ),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('../features/portal/tasks/my-tasks/my-tasks.component').then(
            (m) => m.MyTasksComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import(
            '../features/portal/student/notifications/student-notifications.component'
          ).then((m) => m.StudentNotificationsComponent),
      },
    ],
  },

  // -- Volunteer Portal Routes --
  {
    path: 'portal/volunteer',
    canActivate: [authGuard, roleGuard(['VOLUNTEER'])],
    children: [
      {
        path: '',
        canActivate: [volunteerStatusGuard],
        loadComponent: () =>
          import('../features/portal/volunteer/dashboard/volunteer-dashboard.component').then(
            (m) => m.VolunteerDashboardComponent,
          ),
      },
      {
        path: 'status',
        loadComponent: () =>
          import('../features/portal/volunteer/status/volunteer-status.component').then(
            (m) => m.VolunteerStatusComponent,
          ),
      },
      {
        path: 'tasks',
        canActivate: [volunteerStatusGuard],
        loadComponent: () =>
          import('../features/portal/tasks/my-tasks/my-tasks.component').then(
            (m) => m.MyTasksComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import(
            '../features/portal/student/notifications/student-notifications.component'
          ).then((m) => m.StudentNotificationsComponent),
      },
    ],
  },

  {
    path: 'team/:slug',
    loadComponent: () =>
      import('../features/team/trainer-details/trainer-details.component').then(
        (m) => m.TrainerDetailsComponent,
      ),
  },
  {
    path: 'programs/:id',
    loadComponent: () =>
      import('../features/programs/program-details/program-details.component').then(
        (m) => m.ProgramDetailsComponent,
      ),
  },
  {
    path: 'verify',
    loadComponent: () =>
      import('../features/verify/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: 'u/:username',
    loadComponent: () =>
      import('../features/verify/user-public-profile/user-public-profile.component').then(
        (m) => m.UserPublicProfileComponent,
      ),
  },

  { path: '**', component: NotFoundComponent },
];
