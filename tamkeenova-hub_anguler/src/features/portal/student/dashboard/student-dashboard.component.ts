import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { StudentService } from '../../../../core/services/student.service';
import { ConsultationService } from '../../../../core/services/consultation.service';
import { NotificationsService } from '../../../../core/services/notifications.service';
import {
  Consultation,
  Enrollment,
  StudentProfile,
} from '../../../../core/models/student.model';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['../../portal-shared.css', './student-dashboard.component.css'],
})
export class StudentDashboardComponent {
  authService = inject(AuthService);
  private studentService = inject(StudentService);
  private consultationService = inject(ConsultationService);
  private notificationsService = inject(NotificationsService);

  currentUser = this.authService.currentUser;
  isLoading = signal(true);
  hasLoaded = signal(false);

  profile = signal<StudentProfile | null>(null);
  enrollments = signal<Enrollment[]>([]);
  consultations = signal<Consultation[]>([]);

  activeEnrollments = computed(() => this.enrollments().filter((e) => e.status === 'ACTIVE'));
  recentEnrollments = computed(() => this.enrollments().slice(0, 3));
  recentConsultations = computed(() => this.consultations().slice(0, 3));
  unreadCount = this.notificationsService.unreadCount;

  quickActions = [
    {
      icon: 'fa-book-open',
      labelKey: 'student_dashboard.actions.browse_programs',
      route: '/programs',
      color: 'primary',
    },
    {
      icon: 'fa-chalkboard-user',
      labelKey: 'student_dashboard.actions.find_trainer',
      route: '/portal/student/trainers',
      color: 'accent',
    },
    {
      icon: 'fa-comments',
      labelKey: 'student_dashboard.actions.my_consultations',
      route: '/portal/student/consultations',
      color: 'success',
    },
    {
      icon: 'fa-building',
      labelKey: 'student_dashboard.actions.corporate_request',
      route: '/portal/student/corporate-requests',
      color: 'dark',
    },
  ];

  constructor() {
    const profile$ = this.studentService.getProfile().pipe(
      // fallback to prevent forkJoin fail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catchError(() => of(null as any)),
    );
    const enrollments$ = this.studentService.getEnrollments().pipe(catchError(() => of({ data: [] as Enrollment[], total: 0 })));
    const consultations$ = this.consultationService.getMine().pipe(catchError(() => of({ data: [] as Consultation[], total: 0 })));

    forkJoin({
      profile: profile$,
      enrollments: enrollments$,
      consultations: consultations$,
    }).subscribe({
      next: (res) => {
        if (res.profile) this.profile.set(res.profile);
        this.enrollments.set(res.enrollments.data ?? []);
        this.consultations.set(res.consultations.data ?? []);
        this.isLoading.set(false);
        this.hasLoaded.set(true);
      },
      error: () => {
        this.isLoading.set(false);
        this.hasLoaded.set(true);
      },
    });

    this.notificationsService.refreshUnreadCount();
  }

  avatar(): string | null {
    return this.profile()?.profile_image ?? this.currentUser()?.profile_image ?? null;
  }

  displayName(): string {
    return this.profile()?.full_name ?? this.currentUser()?.full_name ?? '';
  }
}
