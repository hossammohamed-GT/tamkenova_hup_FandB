import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { StudentService } from '../../../../core/services/student.service';
import { Enrollment, EnrollmentStatus } from '../../../../core/models/student.model';

@Component({
  selector: 'app-student-enrollments',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './student-enrollments.component.html',
  styleUrls: ['../../portal-shared.css', './student-enrollments.component.css'],
})
export class StudentEnrollmentsComponent {
  private studentService = inject(StudentService);

  isLoading = signal(true);
  enrollments = signal<Enrollment[]>([]);
  activeFilter = signal<EnrollmentStatus | 'ALL'>('ALL');

  selected = signal<Enrollment | null>(null);
  loadingDetails = signal(false);
  cancelTarget = signal<Enrollment | null>(null);
  isCancelling = signal(false);
  toastMessage = signal<string | null>(null);

  readonly statuses: Array<EnrollmentStatus | 'ALL'> = [
    'ALL',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'SUSPENDED',
  ];

  filtered = computed(() => {
    const f = this.activeFilter();
    const list = this.enrollments();
    return f === 'ALL' ? list : list.filter((e) => e.status === f);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.studentService.getEnrollments().subscribe({
      next: (res) => {
        this.enrollments.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  setFilter(status: EnrollmentStatus | 'ALL'): void {
    this.activeFilter.set(status);
  }

  openDetails(enrollment: Enrollment): void {
    this.selected.set(enrollment);
    this.loadingDetails.set(true);
    this.studentService.getEnrollmentDetails(enrollment.id).subscribe({
      next: (res) => {
        this.selected.set(res);
        this.loadingDetails.set(false);
      },
      error: () => this.loadingDetails.set(false),
    });
  }

  closeDetails(): void {
    this.selected.set(null);
  }

  askCancel(enrollment: Enrollment): void {
    this.cancelTarget.set(enrollment);
  }

  closeCancel(): void {
    this.cancelTarget.set(null);
  }

  confirmCancel(): void {
    const target = this.cancelTarget();
    if (!target) return;
    this.isCancelling.set(true);
    this.studentService.cancelEnrollment(target.id).subscribe({
      next: () => {
        this.enrollments.update((list) =>
          list.map((e) => (e.id === target.id ? { ...e, status: 'CANCELLED' as EnrollmentStatus } : e)),
        );
        this.isCancelling.set(false);
        this.cancelTarget.set(null);
        this.closeDetails();
        this.showToast('student_enrollments.cancel_success');
      },
      error: () => this.isCancelling.set(false),
    });
  }

  private showToast(key: string): void {
    this.toastMessage.set(key);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  badgeClass(status: EnrollmentStatus): string {
    if (status === 'ACTIVE' || status === 'COMPLETED') return 'badge-approved';
    if (status === 'SUSPENDED') return 'badge-pending';
    return 'badge-rejected';
  }
}
