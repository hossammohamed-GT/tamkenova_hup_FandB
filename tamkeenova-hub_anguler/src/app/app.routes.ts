import { Routes } from '@angular/router';
import { HomeComponent } from '../features/home/home.component';
import { NotFoundComponent } from '../features/not-found/not-found.component.js';
import { guestGuard } from '../core/guards/guest.guard';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { trainerStatusGuard } from '../core/guards/trainer-status.guard';
import { volunteerStatusGuard } from '../core/guards/volunteer-status.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    data: { seo: { titleKey: 'seo.home.title', descriptionKey: 'seo.home.description', index: true, rawTitle: true } },
  },
  {
    path: 'programs',
    data: { seo: { titleKey: 'seo.programs.title', descriptionKey: 'seo.programs.description', index: true } },
    loadComponent: () =>
      import('../features/programs/programs.component').then((m) => m.ProgramsComponent),
  },
  {
    path: 'consulting',
    data: { seo: { titleKey: 'seo.consulting.title', descriptionKey: 'seo.consulting.description', index: true } },
    loadComponent: () =>
      import('../features/consulting/consulting.component').then((m) => m.ConsultingComponent),
  },
  {
    path: 'team',
    data: { seo: { titleKey: 'seo.team.title', descriptionKey: 'seo.team.description', index: true } },
    loadComponent: () => import('../features/team/team.component').then((m) => m.TeamComponent),
  },
  {
    path: 'gallery',
    data: { seo: { titleKey: 'seo.gallery.title', descriptionKey: 'seo.gallery.description', index: true } },
    loadComponent: () =>
      import('../features/gallery-showcase/gallery-showcase.component').then(
        (m) => m.GalleryShowcaseComponent,
      ),
  },

  {
    path: 'register',
    data: { seo: { titleKey: 'seo.register.title', descriptionKey: 'seo.register.description' } },
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'register/trainer',
    data: { seo: { titleKey: 'seo.registerTrainer.title', descriptionKey: 'seo.registerTrainer.description' } },
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/register-trainer/trainer-register.component').then(
        (m) => m.TrainerRegisterComponent,
      ),
  },
  {
    path: 'register/volunteer', redirectTo: 'register/trainee', pathMatch: 'full',
  },
  {
    path: 'register/trainee',
    data: { seo: { titleKey: 'seo.registerTrainee.title', descriptionKey: 'seo.registerTrainee.description' } },
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/register-volunteer/volunteer-register.component').then(
        (m) => m.VolunteerRegisterComponent,
      ),
  },
  {
    path: 'verify-otp',
    data: { seo: { titleKey: 'seo.verifyOtp.title', descriptionKey: 'seo.verifyOtp.description' } },
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/verify-otp/verify-otp.component').then((m) => m.VerifyOtpComponent),
  },
  {
    path: 'login',
    data: { seo: { titleKey: 'seo.login.title', descriptionKey: 'seo.login.description' } },
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    data: { seo: { titleKey: 'seo.forgot.title', descriptionKey: 'seo.forgot.description' } },
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    data: { seo: { titleKey: 'seo.reset.title', descriptionKey: 'seo.reset.description' } },
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  {
    path: 'my-courses',
    canActivate: [authGuard],
    data: {
      seo: { titleKey: 'course_workflow.library', descriptionKey: 'seo.portal.description' },
    },
    loadComponent: () =>
      import('../features/course-workflow/course-library.component').then(
        (m) => m.CourseLibraryComponent,
      ),
  },
  {
    path: 'programs/course/:slug/checkout',
    canActivate: [authGuard],
    data: {
      seo: { titleKey: 'course_workflow.checkout', descriptionKey: 'seo.portal.description' },
    },
    loadComponent: () =>
      import('../features/course-workflow/course-checkout.component').then(
        (m) => m.CourseCheckoutComponent,
      ),
  },
  {
    path: 'portal/trainer/courses',
    canActivate: [authGuard, roleGuard(['TRAINER']), trainerStatusGuard],
    data: { seo: { titleKey: 'course_workflow.studio', descriptionKey: 'seo.portal.description' } },
    loadComponent: () =>
      import('../features/course-workflow/trainer-course-studio.component').then(
        (m) => m.TrainerCourseStudioComponent,
      ),
  },
  {
    path: 'portal/admin/course-workflow',
    canActivate: [authGuard, roleGuard(['ADMIN', 'SUPER_ADMIN'])],
    data: { seo: { titleKey: 'course_workflow.admin', descriptionKey: 'seo.portal.description' } },
    loadComponent: () =>
      import('../features/course-workflow/admin-course-workflow.component').then(
        (m) => m.AdminCourseWorkflowComponent,
      ),
  },
  // Shared by all roles
  {
    path: 'portal/certificates',
    data: { seo: { titleKey: 'student_certificates.title', descriptionKey: 'seo.portal.description' } },
    canActivate: [authGuard],
    loadComponent: () => import('../features/portal/student/certificates/student-certificates.component').then(m => m.StudentCertificatesComponent),
  },
  {
    path: 'portal',
    // Redirects run before guards
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
        if (role === 'VOLUNTEER') return '/portal/trainee';
        return '/portal/student';
      } catch {
        return '/login';
      }
    },
    pathMatch: 'full',
  },
  {
    path: 'portal/student',
    data: { seo: { titleKey: 'seo.studentHome.title', descriptionKey: 'seo.portal.description' } },
    canActivate: [authGuard, roleGuard(['STUDENT'])],
    children: [
      {
        path: '',
        data: { seo: { titleKey: 'seo.studentHome.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/student/dashboard/student-dashboard.component').then(
            (m) => m.StudentDashboardComponent,
          ),
      },
      {
        path: 'profile',
        data: { seo: { titleKey: 'seo.studentProfile.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/student/profile/student-profile.component').then(
            (m) => m.StudentProfileComponent,
          ),
      },
      {
        path: 'enrollments',
        data: { seo: { titleKey: 'student_enrollments.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/student/enrollments/student-enrollments.component').then(
            (m) => m.StudentEnrollmentsComponent,
          ),
      },
      {
        path: 'consultations',
        data: { seo: { titleKey: 'student_consultations.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import(
            '../features/portal/student/consultations/student-consultations.component'
          ).then((m) => m.StudentConsultationsComponent),
      },
      {
        path: 'certificates',
        data: { seo: { titleKey: 'student_certificates.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import(
            '../features/portal/student/certificates/student-certificates.component'
          ).then((m) => m.StudentCertificatesComponent),
      },
      {
        path: 'corporate-requests',
        data: { seo: { titleKey: 'student_corporate.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import(
            '../features/portal/student/corporate-requests/student-corporate-requests.component'
          ).then((m) => m.StudentCorporateRequestsComponent),
      },
      {
        path: 'reviews',
        data: { seo: { titleKey: 'student_reviews.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/student/reviews/student-reviews.component').then(
            (m) => m.StudentReviewsComponent,
          ),
      },
      {
        path: 'notifications',
        data: { seo: { titleKey: 'notifications.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import(
            '../features/portal/student/notifications/student-notifications.component'
          ).then((m) => m.StudentNotificationsComponent),
      },
      {
        path: 'trainers',
        data: { seo: { titleKey: 'student_trainers.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/student/trainers/student-trainers.component').then(
            (m) => m.StudentTrainersComponent,
          ),
      },
    ],
  },

  {
    path: 'portal/trainer',
    data: { seo: { titleKey: 'seo.trainerHome.title', descriptionKey: 'seo.portal.description' } },
    canActivate: [authGuard, roleGuard(['TRAINER'])],
    children: [
      {
        path: '',
        data: { seo: { titleKey: 'seo.trainerHome.title', descriptionKey: 'seo.portal.description' } },
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/dashboard/trainer-dashboard.component').then(
            (m) => m.TrainerDashboardComponent,
          ),
      },
      {
        path: 'status',
        data: { seo: { titleKey: 'seo.trainerStatus.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/trainer/status/trainer-status.component').then(
            (m) => m.TrainerStatusComponent,
          ),
      },
      {
        path: 'profile',
        data: { seo: { titleKey: 'seo.trainerProfile.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/trainer/profile/trainer-profile.component').then(
            (m) => m.TrainerProfileComponent,
          ),
      },
      {
        path: 'programs',
        data: { seo: { titleKey: 'trainer_programs.title', descriptionKey: 'seo.portal.description' } },
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/programs/trainer-programs.component').then(
            (m) => m.TrainerProgramsComponent,
          ),
      },
      {
        path: 'availability',
        data: { seo: { titleKey: 'trainer_availability.title', descriptionKey: 'seo.portal.description' } },
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/availability/trainer-availability.component').then(
            (m) => m.TrainerAvailabilityComponent,
          ),
      },
      {
        path: 'consultations',
        data: { seo: { titleKey: 'seo.trainerConsultations.title', descriptionKey: 'seo.portal.description' } },
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/consultations/trainer-consultations.component').then(
            (m) => m.TrainerConsultationsComponent,
          ),
      },
      {
        path: 'reviews',
        data: { seo: { titleKey: 'trainer_reviews.title', descriptionKey: 'seo.portal.description' } },
        canActivate: [trainerStatusGuard],
        loadComponent: () =>
          import('../features/portal/trainer/reviews/trainer-reviews.component').then(
            (m) => m.TrainerReviewsComponent,
          ),
      },
      {
        path: 'notifications',
        data: { seo: { titleKey: 'notifications.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import(
            '../features/portal/student/notifications/student-notifications.component'
          ).then((m) => m.StudentNotificationsComponent),
      },
    ],
  },

  {
    path: 'portal/admin',
    data: { seo: { titleKey: 'admin_dashboard.title', descriptionKey: 'seo.portal.description' } },
    canActivate: [authGuard, roleGuard(['ADMIN', 'SUPER_ADMIN'])],
    children: [
      {
        path: '',
        data: { seo: { titleKey: 'admin_dashboard.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'users',
        data: { seo: { titleKey: 'admin_users.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/admin/users/admin-users.component').then(
            (m) => m.AdminUsersComponent,
          ),
      },
      {
        path: 'trainers',
        data: { seo: { titleKey: 'admin_trainers.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/admin/trainers/admin-trainers.component').then(
            (m) => m.AdminTrainersComponent,
          ),
      },
      {
        path: 'volunteers', redirectTo: 'trainees', pathMatch: 'full',
      },
      {
        path: 'trainees',
        data: { seo: { titleKey: 'admin_volunteers.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/admin/volunteers/admin-volunteers.component').then(
            (m) => m.AdminVolunteersComponent,
          ),
      },
      {
        path: 'certificates',
        data: { seo: { titleKey: 'admin_certificates.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/admin/certificates/admin-certificates.component').then(
            (m) => m.AdminCertificatesComponent,
          ),
      },
      {
        path: 'corporate',
        data: { seo: { titleKey: 'admin_corporate.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/admin/corporate/admin-corporate.component').then(
            (m) => m.AdminCorporateComponent,
          ),
      },
      {
        path: 'specializations',
        data: { seo: { titleKey: 'admin_specializations.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/admin/specializations/admin-specializations.component').then(
            (m) => m.AdminSpecializationsComponent,
          ),
      },
      {
        path: 'partners',
        data: { seo: { titleKey: 'admin_partners.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () => import('../features/portal/admin/partners/admin-partners.component').then((m) => m.AdminPartnersComponent),
      },
      {
        path: 'programs',
        data: { seo: { titleKey: 'admin_programs.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/admin/programs/admin-programs.component').then(
            (m) => m.AdminProgramsComponent,
          ),
      },
      {
        path: 'tasks',
        data: { seo: { titleKey: 'admin_tasks.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/admin/tasks/admin-tasks.component').then(
            (m) => m.AdminTasksComponent,
          ),
      },
    ],
  },

  {
    path: 'portal/employee',
    data: { seo: { titleKey: 'employee_dashboard.title', descriptionKey: 'seo.portal.description' } },
    canActivate: [authGuard, roleGuard(['EMPLOYEE'])],
    children: [
      {
        path: '',
        data: { seo: { titleKey: 'employee_dashboard.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/employee/dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
          ),
      },
      {
        path: 'tasks',
        data: { seo: { titleKey: 'my_tasks.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/tasks/my-tasks/my-tasks.component').then(
            (m) => m.MyTasksComponent,
          ),
      },
      {
        path: 'notifications',
        data: { seo: { titleKey: 'notifications.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import(
            '../features/portal/student/notifications/student-notifications.component'
          ).then((m) => m.StudentNotificationsComponent),
      },
      {
        path: 'profile',
        data: { seo: { titleKey: 'staff_profile.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/staff/profile/staff-profile.component').then(
            (m) => m.StaffProfileComponent,
          ),
      },
    ],
  },

  {
    path: 'portal/volunteer', redirectTo: 'portal/trainee',
  },
  {
    path: 'portal/trainee',
    data: { seo: { titleKey: 'volunteer_dashboard.title', descriptionKey: 'seo.portal.description' } },
    canActivate: [authGuard, roleGuard(['VOLUNTEER'])],
    children: [
      {
        path: '',
        data: { seo: { titleKey: 'volunteer_dashboard.title', descriptionKey: 'seo.portal.description' } },
        canActivate: [volunteerStatusGuard],
        loadComponent: () =>
          import('../features/portal/volunteer/dashboard/volunteer-dashboard.component').then(
            (m) => m.VolunteerDashboardComponent,
          ),
      },
      {
        path: 'status',
        data: { seo: { titleKey: 'seo.volunteerStatus.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/volunteer/status/volunteer-status.component').then(
            (m) => m.VolunteerStatusComponent,
          ),
      },
      {
        path: 'tasks',
        data: { seo: { titleKey: 'my_tasks.title', descriptionKey: 'seo.portal.description' } },
        canActivate: [volunteerStatusGuard],
        loadComponent: () =>
          import('../features/portal/tasks/my-tasks/my-tasks.component').then(
            (m) => m.MyTasksComponent,
          ),
      },
      {
        path: 'notifications',
        data: { seo: { titleKey: 'notifications.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import(
            '../features/portal/student/notifications/student-notifications.component'
          ).then((m) => m.StudentNotificationsComponent),
      },
      {
        path: 'profile',
        data: { seo: { titleKey: 'staff_profile.title', descriptionKey: 'seo.portal.description' } },
        loadComponent: () =>
          import('../features/portal/staff/profile/staff-profile.component').then(
            (m) => m.StaffProfileComponent,
          ),
      },
    ],
  },

  {
    path: 'team/:slug',
    data: { seo: { titleKey: 'seo.trainerDetails.title', descriptionKey: 'seo.trainerDetails.description', index: true, ogType: 'profile' } },
    loadComponent: () =>
      import('../features/team/trainer-details/trainer-details.component').then(
        (m) => m.TrainerDetailsComponent,
      ),
  },
  {
    path: 'programs/course/:slug',
    data: { seo: { titleKey: 'seo.courseDetails.title', descriptionKey: 'seo.courseDetails.description', index: true, ogType: 'article' } },
    loadComponent: () =>
      import('../features/programs/course-details/course-details.component').then(
        (m) => m.CourseDetailsComponent,
      ),
  },
  {
    path: 'programs/:id',
    data: { seo: { titleKey: 'seo.programDetails.title', descriptionKey: 'seo.programDetails.description', index: true, ogType: 'article' } },
    loadComponent: () =>
      import('../features/programs/program-details/program-details.component').then(
        (m) => m.ProgramDetailsComponent,
      ),
  },
  {
    path: 'verify',
    data: { seo: { titleKey: 'seo.verify.title', descriptionKey: 'seo.verify.description' } },
    loadComponent: () =>
      import('../features/verify/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: 'u/:username',
    data: { seo: { titleKey: 'seo.publicProfile.title', descriptionKey: 'seo.publicProfile.description' } },
    loadComponent: () =>
      import('../features/verify/user-public-profile/user-public-profile.component').then(
        (m) => m.UserPublicProfileComponent,
      ),
  },

  {
    path: '**',
    component: NotFoundComponent,
    data: { seo: { titleKey: 'seo.notfound.title', descriptionKey: 'seo.notfound.description' } },
  },
];
