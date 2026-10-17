import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThemeService } from '../../../../core/services/theme.service';
import {
  CourseCategoryAdminService,
  CategoryDraft,
  ManagedCategory,
} from '../../../../core/services/course-category-admin.service';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { FormFeedback } from '../../../../shared/forms/form-feedback';
import { INLINE_ERRORS } from '../../../../shared/forms/inline-errors.directive';
import { workflowError } from '../../../../core/services/course-workflow.service';
@Component({
  selector: 'app-course-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, ...INLINE_ERRORS],
  templateUrl: './course-categories.component.html',
  styleUrl: './course-categories.component.css',
})
export class CourseCategoriesComponent {
  private readonly api = inject(CourseCategoryAdminService);
  private readonly theme = inject(ThemeService);
  private readonly destroy = inject(DestroyRef);
  readonly rows = signal<ManagedCategory[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly editing = signal<string | null>(null);
  readonly showForm = signal(false);
  private readonly confirmation = viewChild<ElementRef<HTMLDialogElement>>('confirmation');
  readonly pendingDelete = signal<ManagedCategory | null>(null);
  readonly error = signal('');
  readonly success = signal('');
  readonly feedback = new FormFeedback();
  readonly parents = computed(() =>
    this.rows().filter((row) => !row.parent_id && row.id !== this.editing()),
  );
  draft: CategoryDraft = this.empty();
  constructor() {
    this.load();
    effect(() => {
      const dialog = this.confirmation()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }
  cancelDelete(event: Event) {
    if (this.busy()) event.preventDefault();
    else this.pendingDelete.set(null);
  }
  t(ar: string, en: string) {
    return this.theme.language() === 'en' ? en : ar;
  }
  empty(): CategoryDraft {
    return {
      name_ar: '',
      name_en: '',
      slug: '',
      description_ar: '',
      description_en: '',
      image_url: null,
      parent_id: null,
      display_order: 0,
      is_active: true,
    };
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .list()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(workflowError(e));
          this.loading.set(false);
        },
      });
  }
  name(row: ManagedCategory) {
    return this.t(row.name_ar, row.name_en);
  }
  parentName(row: ManagedCategory) {
    const parent = this.rows().find((p) => p.id === row.parent_id);
    return parent ? this.name(parent) : this.t('تصنيف رئيسي', 'Top-level category');
  }
  isVisible(row: ManagedCategory) {
    return (
      row.is_active &&
      (!row.parent_id || !!this.rows().find((p) => p.id === row.parent_id)?.is_active)
    );
  }
  canDelete(row: ManagedCategory) {
    return Object.values(row._count).every((n) => n === 0);
  }
  open(row?: ManagedCategory) {
    this.editing.set(row?.id ?? null);
    this.feedback.reset();
    this.success.set('');
    this.error.set('');
    this.draft = row
      ? {
          name_ar: row.name_ar,
          name_en: row.name_en,
          slug: row.slug,
          description_ar: row.description_ar ?? '',
          description_en: row.description_en ?? '',
          image_url: row.image_url ?? null,
          parent_id: row.parent_id ?? null,
          display_order: row.display_order,
          is_active: row.is_active,
        }
      : this.empty();
    this.showForm.set(true);
  }
  close() {
    if (!this.busy()) {
      this.showForm.set(false);
      this.feedback.reset();
    }
  }
  save(form: NgForm) {
    if (this.busy() || !this.feedback.validate(form)) return;
    const draft = {
      ...this.draft,
      name_ar: this.draft.name_ar.trim(),
      name_en: this.draft.name_en.trim(),
      slug: this.draft.slug.trim(),
      image_url: this.draft.image_url?.trim() || null,
    };
    this.busy.set(true);
    this.api
      .save(draft, this.editing() ?? undefined)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.showForm.set(false);
          this.success.set(this.t('تم حفظ التصنيف', 'Category saved'));
          this.load();
        },
        error: (e) => {
          this.busy.set(false);
          this.feedback.fail(e);
        },
      });
  }
  upload(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file || this.busy()) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.feedback.setField(
        'image_url',
        this.t(
          'اختر صورة JPG أو PNG أو WEBP بحد أقصى 5MB',
          'Choose a JPG, PNG or WEBP image up to 5MB',
        ),
      );
      return;
    }
    this.busy.set(true);
    this.feedback.clearField('image_url');
    this.api
      .upload(file)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (url) => {
          this.draft.image_url = url;
          this.busy.set(false);
        },
        error: (e) => {
          this.busy.set(false);
          this.feedback.setField('image_url', workflowError(e));
        },
      });
  }
  toggle(row: ManagedCategory) {
    this.action(this.api.visibility(row), this.t('تم تحديث الظهور', 'Visibility updated'));
  }
  remove() {
    const row = this.pendingDelete();
    if (!row || !this.canDelete(row)) return;
    this.action(this.api.remove(row.id), this.t('تم حذف التصنيف', 'Category deleted'));
  }
  private action(request: ReturnType<CourseCategoryAdminService['remove']>, message: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        this.busy.set(false);
        this.pendingDelete.set(null);
        this.success.set(message);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.pendingDelete.set(null);
        this.error.set(workflowError(e));
      },
    });
  }
}
