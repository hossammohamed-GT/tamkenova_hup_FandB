import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TasksService } from '../../../../core/services/tasks.service';
import { submissionFiles } from '../../../../core/utils/submission-presentation';
import { apiErrorKey } from '../../../../core/utils/api-error';
import {
  MyTaskItem,
  TaskComment,
  TaskPriority,
  TaskStatus,
} from '../../../../core/models/tasks.model';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './my-tasks.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './my-tasks.component.css'],
})
export class MyTasksComponent implements OnInit {
  private tasksService = inject(TasksService);
  private fb = inject(FormBuilder);

  readonly statusFilters: Array<TaskStatus | 'ALL'> = [
    'ALL',
    'PENDING',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
  ];

  isLoading = signal(true);
  hasError = signal(false);
  tasks = signal<MyTaskItem[]>([]);
  activeFilter = signal<TaskStatus | 'ALL'>('ALL');

  busy = signal(false);

  // -- Details modal --
  selected = signal<MyTaskItem | null>(null);
  comments = signal<TaskComment[]>([]);
  isLoadingComments = signal(false);

  // -- Submit form --
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  selectedFiles = signal<File[]>([]);
  readonly maxFiles = 10;
  readonly maxFileSize = 25 * 1024 * 1024;

  filesOf(submission: any) {
    return submissionFiles(submission);
  }

  submitForm = this.fb.nonNullable.group({
    content: [''],
    link_url: [''],
  });

  // -- Comments --
  commentForm = this.fb.nonNullable.group({ body: ['', Validators.required] });
  isSendingComment = signal(false);

  toast = signal<{ key: string; error?: boolean } | null>(null);

  filtered = computed(() => {
    const f = this.activeFilter();
    const list = this.tasks();
    if (f === 'ALL') return list;
    return list.filter((t) => t.status === f);
  });

  currentTasks = computed(() =>
    this.tasks().filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'),
  );

  priorityBadge(priority: TaskPriority): string {
    switch (priority) {
      case 'URGENT':
        return 'badge-urgent';
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      default:
        return 'badge-low';
    }
  }

  statusBadge(status: TaskStatus): string {
    switch (status) {
      case 'APPROVED':
        return 'badge-approved';
      case 'REJECTED':
        return 'badge-rejected';
      case 'SUBMITTED':
        return 'badge-high';
      case 'IN_PROGRESS':
        return 'badge-info';
      default:
        return 'badge-pending';
    }
  }

  deadlineClass(deadline: string | null | undefined): string {
    if (!deadline) return '';
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return 'is-overdue';
    if (diff < 3 * 24 * 3600 * 1000) return 'is-soon';
    return '';
  }

  canStart(item: MyTaskItem): boolean {
    return item.status === 'PENDING' && !item.is_locked;
  }

  canSubmit(item: MyTaskItem): boolean {
    return item.status === 'IN_PROGRESS' || item.status === 'REJECTED';
  }

  ngOnInit(): void {
    this.load();
  }

  setFilter(filter: TaskStatus | 'ALL'): void {
    this.activeFilter.set(filter);
  }

  // Silent re-fetch (no spinner) to reconcile with the server after mutations
  refresh(): void {
    this.load(false);
  }

  load(showSpinner = true): void {
    if (showSpinner) this.isLoading.set(true);
    this.hasError.set(false);
    this.tasksService.getMyTasks().subscribe({
      next: (list) => {
        // ترتيب المجموعة: غير المنتهية أولاً ثم حسب ترتيب الإسناد
        const sorted = [...list].sort((a, b) => {
          const done = (t: MyTaskItem) => t.status === 'APPROVED';
          if (done(a) !== done(b)) return done(a) ? 1 : -1;
          return (a.task_order ?? 0) - (b.task_order ?? 0);
        });
        this.tasks.set(sorted);
        // Keep the open details modal in sync with the fresh server data
        const openId = this.selected()?.id;
        if (openId) {
          const fresh = sorted.find((t) => t.id === openId);
          if (fresh) this.selected.set(fresh);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  // ================= Details =================

  openDetails(item: MyTaskItem): void {
    this.selected.set(item);
    this.comments.set([]);
    this.submitError.set(null);
    this.selectedFiles.set([]);
    this.submitForm.reset({ content: '', link_url: '' });
    this.loadComments(item);
  }

  closeDetails(): void {
    this.selected.set(null);
    this.selectedFiles.set([]);
  }

  private loadComments(item: MyTaskItem): void {
    this.isLoadingComments.set(true);
    this.tasksService.getComments(item.task_id).subscribe({
      next: (list) => {
        this.comments.set(list);
        this.isLoadingComments.set(false);
      },
      error: () => this.isLoadingComments.set(false),
    });
  }

  // ================= Start =================

  startTask(item: MyTaskItem): void {
    this.busy.set(true);
    this.tasksService.start(item.task_id).subscribe({
      next: () => {
        this.patchItem(item, { status: 'IN_PROGRESS', started_at: new Date().toISOString() });
        this.busy.set(false);
        this.showToast('my_tasks.started');
        this.refresh();
      },
      error: (err) => {
        this.busy.set(false);
        this.showToast(apiErrorKey(err, 'my_tasks.start_error'), true);
      },
    });
  }

  // ================= Submit =================

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    const current = this.selectedFiles();
    const remaining = this.maxFiles - current.length;
    if (remaining <= 0) {
      this.submitError.set('my_tasks.max_files_error');
      return;
    }

    const accepted: File[] = [];
    for (const file of files.slice(0, remaining)) {
      if (file.size > this.maxFileSize) {
        this.submitError.set('my_tasks.file_size_error');
        continue;
      }
      accepted.push(file);
    }
    this.submitError.set(null);
    this.selectedFiles.set([...current, ...accepted]);
  }

  removeFile(index: number): void {
    this.selectedFiles.update((files) => files.filter((_, i) => i !== index));
  }

  submit(): void {
    const item = this.selected();
    if (!item) return;

    const { content, link_url } = this.submitForm.getRawValue();
    const files = this.selectedFiles();

    if (!content.trim() && !link_url.trim() && files.length === 0) {
      this.submitError.set('my_tasks.submit_empty');
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    this.tasksService
      .submit(item.task_id, content.trim() || null, link_url.trim() || null, files)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.patchItem(item, {
            status: 'SUBMITTED',
            submission: {
              id: 'temp-' + Date.now(),
              content: content.trim() || null,
              link_url: link_url.trim() || null,
              submitted_at: new Date().toISOString(),
            },
          });
          this.selectedFiles.set([]);
          this.showToast('my_tasks.submitted');
          this.refresh();
        },
        error: () => {
          this.isSubmitting.set(false);
          this.submitError.set('my_tasks.submit_error');
        },
      });
  }

  // ================= Comments =================

  sendComment(): void {
    const item = this.selected();
    if (!item || this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }
    const body = this.commentForm.getRawValue().body;
    this.isSendingComment.set(true);
    this.tasksService.addComment(item.task_id, body).subscribe({
      next: (comment) => {
        if (comment) this.comments.update((list) => [...list, comment]);
        this.commentForm.reset({ body: '' });
        this.isSendingComment.set(false);
      },
      error: (err) => {
        this.isSendingComment.set(false);
        this.showToast(apiErrorKey(err, 'my_tasks.comment_error'), true);
      },
    });
  }

  // ================= Timeline =================

  timelineSteps(item: MyTaskItem): { key: string; state: 'done' | 'current' | 'todo' | 'rejected' }[] {
    const status = item.status;
    const flow: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'SUBMITTED'];
    const currentIndex = flow.indexOf(status);

    if (status === 'APPROVED' || status === 'REJECTED') {
      return [
        ...flow.map((step, index) => ({ key: step, state: 'done' as const })),
        { key: status, state: status === 'REJECTED' ? ('rejected' as const) : ('current' as const) },
      ];
    }

    return flow.map((step, index) => ({
      key: step,
      state: index < currentIndex ? ('done' as const) : index === currentIndex ? ('current' as const) : ('todo' as const),
    }));
  }

  private patchItem(item: MyTaskItem, patch: Partial<MyTaskItem>): void {
    this.tasks.update((list) => list.map((t) => (t.id === item.id ? { ...t, ...patch } : t)));
    this.selected.update((s) => (s && s.id === item.id ? { ...s, ...patch } : s));
  }

  private showToast(key: string, error = false): void {
    this.toast.set({ key, error });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
