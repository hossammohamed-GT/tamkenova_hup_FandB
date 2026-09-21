import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminProgram } from '../../../../core/models/admin.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { apiErrorKey } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-admin-programs',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent],
  templateUrl: './admin-programs.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-programs.component.css'],
})
export class AdminProgramsComponent implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);

  isLoading = signal(true);
  hasError = signal(false);
  programs = signal<AdminProgram[]>([]);
  search = signal('');
  visibilityFilter = signal<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');

  busyId = signal<string | null>(null);

  // -- Edit modal --
  editTarget = signal<AdminProgram | null>(null);
  isSaving = signal(false);

  // -- Delete confirm --
  deleteTarget = signal<AdminProgram | null>(null);
  isDeleting = signal(false);

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    price: this.fb.control<number | null>(null),
    duration_hours: this.fb.control<number | null>(null),
  });

  toast = signal<{ key: string; error?: boolean } | null>(null);

  filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const visibility = this.visibilityFilter();
    return this.programs().filter((p) => {
      if (visibility === 'VISIBLE' && p.is_hidden) return false;
      if (visibility === 'HIDDEN' && !p.is_hidden) return false;
      if (!term) return true;
      return (
        (p.title ?? '').toLowerCase().includes(term) ||
        (p.trainers?.users?.full_name ?? '').toLowerCase().includes(term)
      );
    });
  });

  readonly visibilityOptions: Array<'ALL' | 'VISIBLE' | 'HIDDEN'> = ['ALL', 'VISIBLE', 'HIDDEN'];

  ngOnInit(): void {
    this.load();
  }

  ratingDisplay(program: AdminProgram): string {
    if (program.average_rating === null || program.average_rating === undefined || program.average_rating === '') {
      return '—';
    }
    return Number(program.average_rating).toFixed(1);
  }

  // Silent re-fetch (no spinner) to reconcile with the server after mutations
  refresh(): void {
    this.load(false);
  }

  load(showSpinner = true): void {
    if (showSpinner) this.isLoading.set(true);
    this.hasError.set(false);
    this.adminService.getPrograms().subscribe({
      next: (list) => {
        this.programs.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  setVisibility(filter: 'ALL' | 'VISIBLE' | 'HIDDEN'): void {
    this.visibilityFilter.set(filter);
  }

  isVisible(program: AdminProgram): boolean {
    return !program.is_hidden && program.is_published !== false;
  }

  // ================= Hide / Show =================

  toggleVisibility(program: AdminProgram): void {
    this.busyId.set(program.id);
    const currentlyVisible = this.isVisible(program);
    const call$ = currentlyVisible
      ? this.adminService.hideProgram(program.id)
      : this.adminService.showProgram(program.id);

    call$.subscribe({
      next: (updated) => {
        this.programs.update((list) =>
          list.map((p) =>
            p.id === program.id ? { ...p, ...(updated ?? {}), is_hidden: currentlyVisible } : p,
          ),
        );
        this.busyId.set(null);
        this.showToast(currentlyVisible ? 'admin_programs.hidden' : 'admin_programs.shown');
        this.refresh();
      },
      error: (err) => {
        this.busyId.set(null);
        this.showToast(apiErrorKey(err, 'admin_programs.action_error'), true);
      },
    });
  }

  // ================= Edit =================

  openEdit(program: AdminProgram): void {
    this.editTarget.set(program);
    this.form.reset({
      title: program.title ?? '',
      description: program.description ?? '',
      price: program.price !== null && program.price !== undefined ? Number(program.price) : null,
      duration_hours: program.duration_hours ?? null,
    });
  }

  closeEdit(): void {
    this.editTarget.set(null);
    this.isSaving.set(false);
  }

  save(): void {
    const target = this.editTarget();
    if (!target || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.isSaving.set(true);
    this.adminService
      .updateProgram(target.id, {
        title: raw.title,
        description: raw.description || undefined,
        price: raw.price ?? undefined,
        duration_hours: raw.duration_hours ?? undefined,
      })
      .subscribe({
        next: (updated) => {
          this.programs.update((list) =>
            list.map((p) => (p.id === target.id ? { ...p, ...(updated ?? raw) } : p)),
          );
          this.isSaving.set(false);
          this.closeEdit();
          this.showToast('admin_programs.updated');
          this.refresh();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showToast(apiErrorKey(err, 'admin_programs.update_error'), true);
        },
      });
  }

  // ================= Delete =================

  askDelete(program: AdminProgram): void {
    this.deleteTarget.set(program);
  }

  closeDelete(): void {
    this.deleteTarget.set(null);
    this.isDeleting.set(false);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.isDeleting.set(true);
    this.adminService.deleteProgram(target.id).subscribe({
      next: () => {
        this.programs.update((list) => list.filter((p) => p.id !== target.id));
        this.isDeleting.set(false);
        this.closeDelete();
        this.showToast('admin_programs.deleted');
        this.refresh();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.showToast(apiErrorKey(err, 'admin_programs.delete_error'), true);
      },
    });
  }

  private showToast(key: string, error = false): void {
    this.toast.set({ key, error });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
