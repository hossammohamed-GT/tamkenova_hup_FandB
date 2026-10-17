import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CourseWorkflowService,
  CourseDraft,
  DraftChapter,
  WorkflowCourse,
  WorkflowEnrollment,
  workflowError,
  workflowStatus,
} from '../../core/services/course-workflow.service';
import { CourseCatalogService } from '../../core/services/course-catalog.service';
import { CourseCategory } from '../../core/models/course-catalog.model';
import { YoutubePlayerComponent } from '../../shared/components/youtube-player/youtube-player.component';
@Component({
  selector: 'app-trainer-course-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, YoutubePlayerComponent],
  templateUrl: './trainer-course-studio.component.html',
  styleUrl: './workflow.css',
})
export class TrainerCourseStudioComponent {
  private readonly api = inject(CourseWorkflowService);
  private readonly catalog = inject(CourseCatalogService);
  private readonly language = inject(TranslateService);
  private readonly destroy = inject(DestroyRef);
  courses = signal<WorkflowCourse[]>([]);
  completions = signal<WorkflowEnrollment[]>([]);
  categories = signal<CourseCategory[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  success = signal('');
  editor = signal(false);
  editingId: string | undefined;
  preview = signal('');
  draft: CourseDraft = this.empty();
  completionNotes: Record<string, string> = {};
  signatures: Record<string, string> = {};
  constructor() {
    this.load();
    this.catalog
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (rows) => this.categories.set(rows.flatMap((c) => [c, ...(c.children || [])])),
        error: (e) => this.error.set(workflowError(e)),
      });
  }
  statusLabel(value: string) {
    return workflowStatus(value, this.t('ar', 'en') === 'en');
  }
  t(ar: string, en: string) {
    return this.language.currentLang() === 'en' ? en : ar;
  }
  title(course: WorkflowCourse) {
    return this.t(course.title_ar, course.title_en);
  }
  empty(): CourseDraft {
    return {
      title_ar: '',
      title_en: '',
      description_ar: '',
      description_en: '',
      category_id: '',
      preview_video_url: '',
      cover_image_url: '',
      price: 0,
      language: 'ar',
      level: 'BEGINNER',
      sections: [],
    };
  }
  chapter(): DraftChapter {
    return {
      title_ar: '',
      title_en: '',
      lessons: [
        { title_ar: '', title_en: '', media_url: '', duration_minutes: 1, is_preview: false },
      ],
    };
  }
  load() {
    this.loading.set(true);
    this.api
      .trainerCourses()
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
    this.api
      .completions()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (rows) => this.completions.set(rows),
        error: (e) => this.error.set(workflowError(e)),
      });
  }
  create() {
    this.editingId = undefined;
    this.draft = this.empty();
    this.draft.sections.push(this.chapter());
    this.editor.set(true);
    this.error.set('');
    this.success.set('');
  }
  edit(course: WorkflowCourse) {
    this.busy.set(true);
    this.api
      .course(course.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (row) => {
          this.editingId = row.id;
          this.draft = {
            ...this.empty(),
            title_ar: row.title_ar,
            title_en: row.title_en,
            description_ar: row.description_ar || '',
            description_en: row.description_en || '',
            category_id: row.category_links?.[0]?.category_id || '',
            preview_video_url: row.preview_video_url || '',
            cover_image_url: row.cover_image_url || '',
            price: Number(row.price),
            language: row.language || 'ar',
            level: row.level || 'BEGINNER',
            sections: (row.sections || []).map((s) => ({
              title_ar: s.title_ar,
              title_en: s.title_en,
              lessons: s.lessons.map((l) => ({
                title_ar: l.title_ar,
                title_en: l.title_en,
                media_url: l.media_url,
                duration_minutes: l.duration_minutes,
                is_preview: l.is_preview,
              })),
            })),
          };
          this.editor.set(true);
          this.busy.set(false);
        },
        error: (e) => {
          this.error.set(workflowError(e));
          this.busy.set(false);
        },
      });
  }
  save() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .saveCourse(this.draft, this.editingId)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (row) => {
          this.editingId = row.id;
          this.editor.set(false);
          this.busy.set(false);
          this.success.set(
            this.t(
              'اتحفظت المسودة. ابعتها للمراجعة من القائمة.',
              'Draft saved. Submit it for review from the list.',
            ),
          );
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
  submit(course: WorkflowCourse) {
    this.busy.set(true);
    this.error.set('');
    this.api
      .submit(course.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.success.set(
            this.t('تم الإرسال وإشعار كل الأدمن.', 'Submitted and all active admins notified.'),
          );
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
  review(row: WorkflowEnrollment, approve: boolean) {
    this.busy.set(true);
    this.error.set('');
    this.api
      .reviewCompletion(row.id, {
        decision: approve ? 'APPROVE' : 'REJECT',
        note: this.completionNotes[row.id] || '',
        ...(this.signatures[row.id] ? { signature_name: this.signatures[row.id] } : {}),
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.success.set(
            this.t(
              approve
                ? 'تم اعتماد الإتمام وإصدار الشهادة تلقائيًا.'
                : 'تم إرسال سبب إعادة المراجعة للطالب.',
              approve
                ? 'Completion approved and certificate issued.'
                : 'Feedback sent to the learner.',
            ),
          );
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
}
