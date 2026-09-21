import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../../core/services/admin.service';
import { SpecializationService } from '../../../../core/services/specialization.service';
import { Specialization } from '../../../../core/models/specialization.model';
import { SpecializationSuggestion } from '../../../../core/models/admin.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { apiErrorKey } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-admin-specializations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent],
  templateUrl: './admin-specializations.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-specializations.component.css'],
})
export class AdminSpecializationsComponent implements OnInit {
  private adminService = inject(AdminService);
  private specializationService = inject(SpecializationService);
  private fb = inject(FormBuilder);

  activeTab = signal<'requests' | 'list'>('requests');

  isLoadingRequests = signal(true);
  isLoadingList = signal(true);
  hasError = signal(false);

  requests = signal<SpecializationSuggestion[]>([]);
  specializations = signal<Specialization[]>([]);

  // -- Add / edit form --
  showForm = signal(false);
  editTarget = signal<Specialization | null>(null);
  isSaving = signal(false);

  // -- Delete confirm --
  deleteTarget = signal<Specialization | null>(null);
  isDeleting = signal(false);

  busyRequestId = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name_ar: ['', Validators.required],
    name_en: ['', Validators.required],
  });

  toast = signal<{ key: string; error?: boolean } | null>(null);

  ngOnInit(): void {
    this.loadRequests();
    this.loadList();
  }

  setTab(tab: 'requests' | 'list'): void {
    this.activeTab.set(tab);
  }

  loadRequests(): void {
    this.isLoadingRequests.set(true);
    this.adminService.getSpecializationRequests().subscribe({
      next: (list) => {
        this.requests.set(list);
        this.isLoadingRequests.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoadingRequests.set(false);
      },
    });
  }

  loadList(): void {
    this.isLoadingList.set(true);
    this.specializationService.getAll().subscribe({
      next: (list) => {
        this.specializations.set(list ?? []);
        this.isLoadingList.set(false);
      },
      error: () => {
        this.isLoadingList.set(false);
      },
    });
  }

  // ================= Requests =================

  decideRequest(request: SpecializationSuggestion, approve: boolean): void {
    this.busyRequestId.set(request.id);
    const call$ = approve
      ? this.adminService.approveSpecializationRequest(request.id)
      : this.adminService.rejectSpecializationRequest(request.id);

    call$.subscribe({
      next: () => {
        this.requests.update((list) => list.filter((r) => r.id !== request.id));
        this.busyRequestId.set(null);
        this.showToast(approve ? 'admin_specializations.request_approved' : 'admin_specializations.request_rejected');
        this.loadList();
      },
      error: (err) => {
        this.busyRequestId.set(null);
        this.showToast(apiErrorKey(err, 'admin_specializations.request_error'), true);
      },
    });
  }

  // ================= Specializations CRUD =================

  openCreate(): void {
    this.editTarget.set(null);
    this.form.reset({ name_ar: '', name_en: '' });
    this.showForm.set(true);
  }

  openEdit(spec: Specialization): void {
    this.editTarget.set(spec);
    this.form.reset({ name_ar: spec.name_ar, name_en: spec.name_en });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editTarget.set(null);
    this.isSaving.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.isSaving.set(true);
    const call$ = this.editTarget()
      ? this.adminService.updateSpecialization(this.editTarget()!.id, raw)
      : this.adminService.createSpecialization(raw);

    call$.subscribe({
      next: (saved) => {
        const item = saved ?? ({ ...raw, id: this.editTarget()?.id ?? '' } as Specialization);
        if (this.editTarget()) {
          this.specializations.update((list) => list.map((s) => (s.id === item.id ? item : s)));
        } else {
          this.specializations.update((list) => [...list, item]);
        }
        this.isSaving.set(false);
        this.closeForm();
        this.showToast(this.editTarget() ? 'admin_specializations.updated' : 'admin_specializations.created');
        this.loadList();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showToast(apiErrorKey(err, 'admin_specializations.save_error'), true);
      },
    });
  }

  askDelete(spec: Specialization): void {
    this.deleteTarget.set(spec);
  }

  closeDelete(): void {
    this.deleteTarget.set(null);
    this.isDeleting.set(false);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.isDeleting.set(true);
    this.adminService.deleteSpecialization(target.id).subscribe({
      next: () => {
        this.specializations.update((list) => list.filter((s) => s.id !== target.id));
        this.isDeleting.set(false);
        this.closeDelete();
        this.showToast('admin_specializations.deleted');
        this.loadList();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.showToast(apiErrorKey(err, 'admin_specializations.delete_error'), true);
      },
    });
  }

  private showToast(key: string, error = false): void {
    this.toast.set({ key, error });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
