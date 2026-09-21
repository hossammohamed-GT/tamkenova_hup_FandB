import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../../../core/services/admin.service';
import { TasksService } from '../../../../core/services/tasks.service';
import { mergeSubmissionsIntoAssignees, submissionFiles, submissionOfAssignee } from '../../../../core/utils/submission-presentation';
import { AdminUser } from '../../../../core/models/admin.model';
import {
  Task,
  TaskAssignee,
  TaskComment,
  TaskPriority,
  TaskStatus,
  TaskSubmission,
} from '../../../../core/models/tasks.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { apiErrorKey } from '../../../../core/utils/api-error';

interface AssigneeRow {
  assignee: TaskAssignee;
  user: AdminUser | null;
}

@Component({
  selector: 'app-admin-tasks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent],
  templateUrl: './admin-tasks.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-tasks.component.css'],
})
export class AdminTasksComponent implements OnInit {
  private adminService = inject(AdminService);
  private tasksService = inject(TasksService);
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);

  readonly statusFilters: Array<TaskStatus | 'ALL'> = [
    'ALL',
    'PENDING',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
  ];

  readonly priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  isLoading = signal(true);
  hasError = signal(false);
  tasks = signal<Task[]>([]);
  activeFilter = signal<TaskStatus | 'ALL'>('ALL');
  submittedCount = computed(
    () =>
      this.tasks().filter((t) => (t.task_assignees ?? []).some((a) => a.status === 'SUBMITTED'))
        .length,
  );

  busyId = signal<string | null>(null);

  // ================= Create / Edit Task =================
  showTaskForm = signal(false);
  editTask = signal<Task | null>(null);
  isSavingTask = signal(false);
  taskFormError = signal<string | null>(null);

  taskForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    priority: this.fb.nonNullable.control<TaskPriority>('MEDIUM'),
    deadline: ['', Validators.required],
    required_score: this.fb.control<number | null>(null),
    estimated_hours: this.fb.control<number | null>(null),
  });

  // -- Assignees picker (create form) --
  pickedUsers = signal<{ user: AdminUser; order: number }[]>([]);
  memberResults = signal<AdminUser[]>([]);
  memberSearchTerm = signal('');
  isSearchingMembers = signal(false);

  // ================= Delete Confirm =================
  deleteTarget = signal<Task | null>(null);
  isDeleting = signal(false);

  // ================= Task Details =================
  details = signal<Task | null>(null);
  isLoadingDetails = signal(false);
  detailsLoadError = signal(false);
  // Task roster (assignees with users) and raw submission rows, merged in assigneeRows
  private roster = signal<TaskAssignee[]>([]);
  private submissionsRaw = signal<any[]>([]);
  submissionsLoading = signal(false);
  // Submissions fetched before are replayed instantly on re-open, then silently refreshed
  private submissionsCache = new Map<string, any[]>();
  comments = signal<TaskComment[]>([]);
  isLoadingComments = signal(false);

  assigneeRows = computed<AssigneeRow[]>(() => {
    if (!this.details()) return [];
    const merged = mergeSubmissionsIntoAssignees(this.roster(), this.submissionsRaw()) as unknown as TaskAssignee[];
    return merged
      .slice()
      .sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0))
      .map((assignee) => ({ assignee, user: (assignee.users as AdminUser | null) ?? null }));
  });

  // -- Review form --
  reviewTarget = signal<TaskAssignee | null>(null);
  reviewForm = this.fb.nonNullable.group({
    score: this.fb.control<number | null>(null),
    note: [''],
  });
  isReviewing = signal(false);

  // -- Add assignee (details) --
  detailMemberResults = signal<AdminUser[]>([]);
  detailMemberSearchTerm = signal('');
  isAddingAssignee = signal(false);
  newAssigneeOrder = this.fb.nonNullable.control<number>(1);

  // -- Comment --
  commentForm = this.fb.nonNullable.group({ body: ['', Validators.required] });
  isSendingComment = signal(false);

  toast = signal<{ key: string; error?: boolean } | null>(null);

  filtered = computed(() => {
    const f = this.activeFilter();
    const list = this.tasks();
    if (f === 'ALL') return list;
    return list.filter((t) => (t.task_assignees ?? []).some((a) => a.status === f));
  });

  deadlineClass(deadline: string | null | undefined): string {
    if (!deadline) return '';
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return 'is-overdue';
    if (diff < 3 * 24 * 3600 * 1000) return 'is-soon';
    return '';
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
    this.tasksService.getAll().subscribe({
      next: (list) => {
        this.tasks.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

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

  // ================= Create / Edit =================

  openCreate(): void {
    this.editTask.set(null);
    this.pickedUsers.set([]);
    this.memberResults.set([]);
    this.taskFormError.set(null);
    this.taskForm.reset({
      title: '',
      description: '',
      priority: 'MEDIUM',
      deadline: '',
      required_score: null,
      estimated_hours: null,
    });
    this.showTaskForm.set(true);
  }

  openEdit(task: Task): void {
    this.editTask.set(task);
    this.pickedUsers.set([]);
    this.taskFormError.set(null);
    const deadline = task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '';
    this.taskForm.reset({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority ?? 'MEDIUM',
      deadline,
      required_score: task.required_score ?? null,
      estimated_hours: task.estimated_hours ?? null,
    });
    this.showTaskForm.set(true);
  }

  closeTaskForm(): void {
    this.showTaskForm.set(false);
    this.editTask.set(null);
    this.isSavingTask.set(false);
  }

  searchMembers(term: string): void {
    const query = term.trim();
    this.memberSearchTerm.set(query);
    if (query.length < 2) {
      this.memberResults.set([]);
      return;
    }
    this.isSearchingMembers.set(true);
    // Search both employees and volunteers
    this.adminService.getUsers({ search: query, role: 'EMPLOYEE', limit: 5 }).subscribe({
      next: (employees) => {
        this.adminService.getUsers({ search: query, role: 'VOLUNTEER', limit: 5 }).subscribe({
          next: (volunteers) => {
            this.memberResults.set([...(employees?.data ?? []), ...(volunteers?.data ?? [])]);
            this.isSearchingMembers.set(false);
          },
          error: () => {
            this.memberResults.set(employees?.data ?? []);
            this.isSearchingMembers.set(false);
          },
        });
      },
      error: () => {
        this.isSearchingMembers.set(false);
      },
    });
  }

  pickMember(user: AdminUser): void {
    const current = this.pickedUsers();
    if (current.some((p) => p.user.id === user.id)) return;
    const nextOrder = current.length + 1;
    this.pickedUsers.set([...current, { user, order: nextOrder }]);
    this.memberResults.set([]);
    this.memberSearchTerm.set('');
  }

  removePicked(userId: string): void {
    const updated = this.pickedUsers()
      .filter((p) => p.user.id !== userId)
      .map((p, index) => ({ ...p, order: index + 1 }));
    this.pickedUsers.set(updated);
  }

  saveTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      this.taskFormError.set('admin_tasks.form_error');
      return;
    }

    const raw = this.taskForm.getRawValue();
    const editing = this.editTask();
    const assignees = this.pickedUsers().map((p) => ({ user_id: p.user.id, task_order: p.order }));

    if (!editing && assignees.length === 0) {
      this.taskFormError.set('admin_tasks.assignees_required');
      return;
    }

    const payload = {
      title: raw.title,
      description: raw.description,
      priority: raw.priority,
      deadline: new Date(raw.deadline).toISOString(),
      required_score: raw.required_score ?? undefined,
      estimated_hours: raw.estimated_hours ?? undefined,
      assignees,
    };

    this.isSavingTask.set(true);
    this.taskFormError.set(null);

    const call$ = editing
      ? this.tasksService.update(editing.id, {
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          deadline: payload.deadline,
          required_score: payload.required_score,
          estimated_hours: payload.estimated_hours,
        })
      : this.tasksService.create(payload);

    call$.subscribe({
      next: (saved) => {
        if (editing) {
          this.tasks.update((list) =>
            list.map((t) => (t.id === editing.id ? { ...t, ...(saved ?? payload) } : t)),
          );
        } else if (saved) {
          this.tasks.update((list) => [saved, ...list]);
        } else {
          this.load();
        }
        this.isSavingTask.set(false);
        this.closeTaskForm();
        this.showToast(editing ? 'admin_tasks.updated' : 'admin_tasks.created');
        this.refresh();
      },
      error: (err) => {
        this.isSavingTask.set(false);
        this.taskFormError.set(apiErrorKey(err, 'admin_tasks.save_error'));
      },
    });
  }

  // ================= Delete =================

  askDelete(task: Task): void {
    this.deleteTarget.set(task);
  }

  closeDelete(): void {
    this.deleteTarget.set(null);
    this.isDeleting.set(false);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.isDeleting.set(true);
    this.tasksService.delete(target.id).subscribe({
      next: () => {
        this.tasks.update((list) => list.filter((t) => t.id !== target.id));
        if (this.details()?.id === target.id) this.details.set(null);
        this.isDeleting.set(false);
        this.closeDelete();
        this.showToast('admin_tasks.deleted');
        this.refresh();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.showToast(apiErrorKey(err, 'admin_tasks.delete_error'), true);
      },
    });
  }

  // ================= Details =================

  openDetails(task: Task): void {
    this.details.set(task);
    this.comments.set([]);
    this.reviewTarget.set(null);
    this.detailMemberResults.set([]);
    this.detailsLoadError.set(false);
    // Seed with whatever the list already carries so names render instantly,
    // then hydrate silently from the dedicated endpoints.
    this.roster.set(task.task_assignees ?? []);
    const cachedSubs = this.submissionsCache.get(task.id) ?? [];
    this.submissionsRaw.set(cachedSubs);
    this.submissionsLoading.set(cachedSubs.length === 0);
    this.newAssigneeOrder.setValue((task.task_assignees?.length ?? 0) + 1);
    this.isLoadingDetails.set((task.task_assignees?.length ?? 0) === 0);
    this.fetchAssignees(task.id);

    this.loadComments(task.id);
  }

  // GET /tasks/:id -> roster (assignees incl. users);
  // GET /tasks/:id/submissions -> submission rows embedding their assignee.
  // Each source fills its own signal; assigneeRows() merges both, so a
  // partial result can never erase names or submissions.
  private fetchAssignees(taskId: string): void {
    this.tasksService.getById(taskId).subscribe({
      next: (task) => {
        if (this.details()?.id !== taskId) return;
        const rows = Array.isArray(task?.task_assignees) ? task.task_assignees : [];
        if (rows.length > 0) this.roster.set(rows);
        // The details payload already carries the comments — show them at once
        // instead of waiting for the dedicated comments request.
        if (this.isLoadingComments() && this.comments().length === 0) {
          const seeded = Array.isArray(task?.task_comments) ? task.task_comments : [];
          if (seeded.length > 0) this.comments.set(seeded);
        }
        // An empty roster is a valid state (no assignees yet) — not an error.
        this.detailsLoadError.set(false);
        this.isLoadingDetails.set(false);
      },
      error: () => {
        if (this.details()?.id !== taskId) return;
        this.isLoadingDetails.set(false);
        this.detailsLoadError.set(this.assigneeRows().length === 0);
      },
    });

    this.submissionsLoading.set(this.submissionsRaw().length === 0);
    this.tasksService.getSubmissions(taskId).subscribe({
      next: (subs) => {
        if (this.details()?.id !== taskId) return;
        const rows = Array.isArray(subs) ? subs : [];
        this.submissionsCache.set(taskId, rows);
        this.submissionsRaw.set(rows);
        this.submissionsLoading.set(false);
      },
      error: () => {
        if (this.details()?.id !== taskId) return;
        this.submissionsLoading.set(false);
      },
    });
  }

  retryDetails(): void {
    const task = this.details();
    if (!task) return;
    this.detailsLoadError.set(false);
    this.isLoadingDetails.set(this.assigneeRows().length === 0);
    this.fetchAssignees(task.id);
  }

  // Re-fetch the open details modal (assignees + their latest statuses)
  private refreshDetailsIfOpen(taskId: string): void {
    if (!taskId || this.details()?.id !== taskId) return;
    this.fetchAssignees(taskId);
  }

  // Template accessors: tolerate alternate backend field names
  submissionOf(assignee: TaskAssignee): TaskSubmission | null {
    return submissionOfAssignee(assignee as any);
  }

  filesOf(submission: TaskSubmission | null) {
    return submissionFiles(submission as any);
  }

  // Review outcome lives on the assignee row and/or its submission
  scoreOf(assignee: TaskAssignee): number | null {
    const row = assignee as any;
    const value = row.score ?? this.submissionOf(assignee)?.score;
    return value === null || value === undefined ? null : Number(value);
  }

  noteOf(assignee: TaskAssignee): string | null {
    const row = assignee as any;
    return row.review_note ?? this.submissionOf(assignee)?.review_note ?? null;
  }

  private loadComments(taskId: string): void {
    this.isLoadingComments.set(true);
    this.tasksService.getComments(taskId).subscribe({
      next: (list) => {
        this.comments.set(list);
        this.isLoadingComments.set(false);
      },
      error: () => this.isLoadingComments.set(false),
    });
  }

  closeDetails(): void {
    this.details.set(null);
    this.reviewTarget.set(null);
  }

  removeAssignee(row: AssigneeRow): void {
    const task = this.details();
    if (!task) return;
    this.busyId.set(row.assignee.id);
    this.tasksService.removeAssignee(task.id, row.assignee.user_id).subscribe({
      next: () => {
        this.roster.update((rows) => rows.filter((a) => a.id !== row.assignee.id));
        this.submissionsRaw.update((subs) =>
          subs.filter((s) => String(s?.task_assignees?.id ?? '') !== String(row.assignee.id)),
        );
        this.busyId.set(null);
        this.showToast('admin_tasks.assignee_removed');
        this.refresh();
      },
      error: (err) => {
        this.busyId.set(null);
        this.showToast(apiErrorKey(err, 'admin_tasks.action_error'), true);
      },
    });
  }

  searchDetailMembers(term: string): void {
    const query = term.trim();
    this.detailMemberSearchTerm.set(query);
    if (query.length < 2) {
      this.detailMemberResults.set([]);
      return;
    }
    this.adminService.getUsers({ search: query, role: 'EMPLOYEE', limit: 4 }).subscribe({
      next: (employees) => {
        this.adminService.getUsers({ search: query, role: 'VOLUNTEER', limit: 4 }).subscribe({
          next: (volunteers) => {
            const existing = new Set((this.details()?.task_assignees ?? []).map((a) => a.user_id));
            this.detailMemberResults.set(
              [...(employees?.data ?? []), ...(volunteers?.data ?? [])].filter(
                (u) => !existing.has(u.id),
              ),
            );
          },
          error: () => this.detailMemberResults.set(employees?.data ?? []),
        });
      },
      error: () => undefined,
    });
  }

  addAssignee(user: AdminUser): void {
    const task = this.details();
    if (!task) return;
    this.isAddingAssignee.set(true);
    this.tasksService.addAssignee(task.id, user.id, this.newAssigneeOrder.value ?? 1).subscribe({
      next: (assignee) => {
        if (assignee) this.roster.update((rows) => [...rows, assignee]);
        this.detailMemberResults.set([]);
        this.detailMemberSearchTerm.set('');
        this.newAssigneeOrder.setValue(this.roster().length + 1);
        this.isAddingAssignee.set(false);
        this.showToast('admin_tasks.assignee_added');
        this.refreshDetailsIfOpen(task.id);
        this.refresh();
      },
      error: (err) => {
        this.isAddingAssignee.set(false);
        this.showToast(apiErrorKey(err, 'admin_tasks.action_error'), true);
      },
    });
  }

  // ================= Review =================

  openReview(row: AssigneeRow): void {
    // Reset BEFORE revealing the block: when the form is created it picks up
    // these values immediately (zoneless renders on the scheduled tick).
    const previousScore = this.scoreOf(row.assignee);
    this.reviewForm.reset({
      score: previousScore !== null ? previousScore : null,
      note: this.noteOf(row.assignee) ?? '',
    });
    this.reviewTarget.set(row.assignee);
  }

  closeReview(): void {
    this.reviewTarget.set(null);
    this.isReviewing.set(false);
  }

  submitReview(action: 'APPROVE' | 'REJECT'): void {
    const assignee = this.reviewTarget();
    if (!assignee) return;

    const raw = this.reviewForm.getRawValue();
    const required = this.details()?.required_score ?? null;

    if (action === 'APPROVE') {
      if (raw.score === null || raw.score === undefined) {
        this.showToast('admin_tasks.score_required', true);
        return;
      }
      if (required !== null && required !== undefined && raw.score < required) {
        // Below required score → the API treats this as rejection
        this.showToast('admin_tasks.score_below_required', true);
        return;
      }
    }

    this.isReviewing.set(true);
    this.tasksService
      .review(assignee.id, {
        action,
        score: action === 'APPROVE' ? (raw.score ?? undefined) : undefined,
        note: raw.note || undefined,
      })
      .subscribe({
        next: () => {
          this.isReviewing.set(false);
          this.closeReview();
          this.showToast(
            action === 'APPROVE' ? 'admin_tasks.review_approved' : 'admin_tasks.review_rejected',
          );
          // Re-hydrate the open modal (fresh statuses, scores, notes) and the list.
          const detail = this.details();
          if (detail) this.fetchAssignees(detail.id);
          this.refresh();
        },
        error: (err) => {
          this.isReviewing.set(false);
          this.showToast(apiErrorKey(err, 'admin_tasks.review_error'), true);
        },
      });
  }

  // ================= Comments =================

  sendComment(): void {
    const task = this.details();
    if (!task || this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }
    const body = this.commentForm.getRawValue().body;
    this.isSendingComment.set(true);
    this.tasksService.addComment(task.id, body).subscribe({
      next: (comment) => {
        if (comment) this.comments.update((list) => [...list, comment]);
        this.commentForm.reset({ body: '' });
        this.isSendingComment.set(false);
      },
      error: (err) => {
        this.isSendingComment.set(false);
        this.showToast(apiErrorKey(err, 'admin_tasks.comment_error'), true);
      },
    });
  }

  private showToast(key: string, error = false): void {
    this.toast.set({ key, error });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
