import { FormFeedback } from '../../shared/forms/form-feedback';
import { INLINE_ERRORS } from '../../shared/forms/inline-errors.directive';
import type { NgForm } from '@angular/forms';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import {
  CourseWorkflowService,
  CheckoutSettings,
  Transfer,
  WorkflowCourse,
  workflowError,
  workflowStatus,
} from '../../core/services/course-workflow.service';
import { AdminNavComponent } from '../portal/admin/admin-nav/admin-nav.component';
import { YoutubePlayerComponent } from '../../shared/components/youtube-player/youtube-player.component';
@Component({
  selector: 'app-admin-course-workflow',
  standalone: true,
  imports: [...INLINE_ERRORS, CommonModule, FormsModule, AdminNavComponent, YoutubePlayerComponent],
  templateUrl: './admin-course-workflow.component.html',
  styleUrl: './workflow.css',
})
export class AdminCourseWorkflowComponent {
  private readonly api = inject(CourseWorkflowService);
  private readonly lang = inject(TranslateService);
  private readonly destroy = inject(DestroyRef);
  tab = signal('courses');
  courses = signal<WorkflowCourse[]>([]);
  payments = signal<Transfer[]>([]);
  selected = signal<WorkflowCourse | null>(null);
  selectedPayment = signal<Transfer | null>(null);
  video = signal('');
  busy = signal(false);
  loading = signal(false);
  error = signal('');
  readonly feedback = new FormFeedback();
  success = signal('');
  settings: CheckoutSettings = {
    enabled: false,
    vodafone_cash: '',
    instapay: '',
    instructions_ar: '',
    instructions_en: '',
  };
  courseFilter = 'PENDING';
  paymentFilter = 'PENDING';
  reviewNote = '';
  confirmedReference = '';
  confirmedAmount: number | null = null;
  acknowledged = false;
  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed(this.destroy))
      .subscribe((params) => {
        this.tab.set(params.get('tab') === 'payments' ? 'payments' : 'courses');
        this.selected.set(null);
        this.selectedPayment.set(null);
        this.load();
      });
    this.api
      .settings()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (settings) => (this.settings = settings),
        error: (e) => this.error.set(workflowError(e)),
      });
  }
  statusLabel(value: string) {
    return workflowStatus(value, this.t('ar', 'en') === 'en');
  }
  t(ar: string, en: string) {
    return this.lang.currentLang() === 'en' ? en : ar;
  }
  title(course: WorkflowCourse) {
    return this.t(course.title_ar, course.title_en);
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    if (this.tab() === 'payments')
      this.api
        .payments(this.paymentFilter)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (rows) => {
            this.payments.set(rows);
            this.loading.set(false);
          },
          error: (e) => {
            this.error.set(workflowError(e));
            this.loading.set(false);
          },
        });
    else
      this.api
        .adminCourses(this.courseFilter)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (rows) => {
            this.courses.set(rows);
            this.loading.set(false);
          },
          error: (e) => {
            this.error.set(workflowError(e));
            this.loading.set(false);
          },
        });
  }
  switchTab(tab: string) {
    this.tab.set(tab);
    this.selected.set(null);
    this.selectedPayment.set(null);
    this.feedback.reset();
    this.error.set('');
    this.success.set('');
    if (tab !== 'settings') this.load();
  }
  open(course: WorkflowCourse) {
    this.feedback.reset();
    this.busy.set(true);
    this.api
      .course(course.id, true)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (row) => {
          this.selected.set(row);
          this.reviewNote = '';
          this.video.set(row.preview_video_url || '');
          this.busy.set(false);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
  run(request: Observable<unknown>, message: string) {
    this.feedback.reset();
    this.busy.set(true);
    this.error.set('');
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        this.busy.set(false);
        this.success.set(message);
        this.selected.set(null);
        this.selectedPayment.set(null);
        if (this.tab() !== 'settings') this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.feedback.fail(e);
      },
    });
  }
  decide(approve: boolean) {
    const course = this.selected();
    if (!course) return;
    this.run(
      this.api.reviewCourse(course, {
        decision: approve ? 'APPROVE' : 'REJECT',
        note: this.reviewNote,
      }),
      this.t('تم حفظ قرار مراجعة الكورس.', 'Course review saved.'),
    );
  }
  openPayment(payment: Transfer) {
    this.feedback.reset();
    this.selectedPayment.set(payment);
    this.reviewNote = '';
    this.confirmedReference = '';
    this.confirmedAmount = null;
    this.acknowledged = false;
  }
  decidePayment(approve: boolean) {
    const payment = this.selectedPayment();
    if (!payment) return;
    this.run(
      this.api.reviewPayment(payment.id, {
        decision: approve ? 'APPROVE' : 'REJECT',
        note: this.reviewNote,
        ...(approve
          ? { confirmed_reference: this.confirmedReference, confirmed_amount: this.confirmedAmount }
          : {}),
      }),
      this.t(
        approve ? 'تم اعتماد التحويل وتفعيل الكورس.' : 'تم رفض الطلب وإشعار الطالب.',
        approve
          ? 'Transfer approved and course activated.'
          : 'Request rejected and learner notified.',
      ),
    );
  }
  saveSettings(form?: NgForm) {
    if (!this.feedback.validate(form)) return;
    this.run(
      this.api.saveSettings(this.settings),
      this.t('اتحفظت بيانات الدفع.', 'Payment settings saved.'),
    );
  }
}
