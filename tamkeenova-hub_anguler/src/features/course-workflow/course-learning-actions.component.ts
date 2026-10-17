import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Course, CourseLesson } from '../../core/models/course-catalog.model';
import { AuthService } from '../../core/services/auth.service';
import {
  CourseWorkflowService,
  WorkflowEnrollment,
  workflowError,
  workflowStatus,
} from '../../core/services/course-workflow.service';
@Component({
  selector: 'app-course-learning-actions',
  host: { class: 'learning-widget' },
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './course-learning-actions.component.html',
  styleUrl: './workflow.css',
})
export class CourseLearningActionsComponent {
  readonly course = input.required<Course>();
  readonly lesson = input<CourseLesson | null>(null);
  readonly auth = inject(AuthService);
  private readonly api = inject(CourseWorkflowService);
  private readonly lang = inject(TranslateService);
  private readonly destroy = inject(DestroyRef);
  state = signal<WorkflowEnrollment | null>(null);
  loading = signal(false);
  busy = signal(false);
  error = signal('');
  nameAr = '';
  nameEn = '';
  constructor() {
    effect((onCleanup) => {
      const id = this.course().id;
      this.state.set(null);
      if (!this.auth.isLoggedIn()) return;
      this.loading.set(true);
      const request = this.api.learning(id).subscribe({
        next: (row) => {
          this.state.set(row);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          if (e.status !== 403) this.error.set(workflowError(e));
        },
      });
      onCleanup(() => request.unsubscribe());
    });
  }
  statusLabel(value: string) {
    return workflowStatus(value, this.t('ar', 'en') === 'en');
  }
  t(ar: string, en: string) {
    return this.lang.currentLang() === 'en' ? en : ar;
  }
  load() {
    this.api
      .learning(this.course().id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (row) => this.state.set(row),
        error: (e) => this.error.set(workflowError(e)),
      });
  }
  done() {
    const lesson = this.lesson();
    return !!lesson && this.state()?.lesson_progress?.some((p) => p.lesson_id === lesson.id);
  }
  enroll() {
    this.busy.set(true);
    this.api
      .enroll(this.course().id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
  mark() {
    const lesson = this.lesson();
    if (!lesson) return;
    this.busy.set(true);
    this.api
      .mark(this.course().id, lesson.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
  request() {
    this.busy.set(true);
    this.api
      .requestCompletion(this.course().id, {
        recipient_name_ar: this.nameAr,
        recipient_name_en: this.nameEn,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
}
