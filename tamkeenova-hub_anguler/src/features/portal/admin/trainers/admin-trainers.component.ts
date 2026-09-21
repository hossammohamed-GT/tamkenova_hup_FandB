import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminUiService } from '../../../../core/services/admin-ui.service';
import {
  AdminTrainer,
  AdminTrainerCertificate,
  AdminTrainerDocument,
} from '../../../../core/models/admin.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

type TrainerFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

@Component({
  selector: 'app-admin-trainers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent],
  templateUrl: './admin-trainers.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-trainers.component.css'],
})
export class AdminTrainersComponent implements OnInit {
  private adminService = inject(AdminService);
  private adminUi = inject(AdminUiService);
  private fb = inject(FormBuilder);

  readonly filters: TrainerFilter[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

  isLoading = signal(true);
  hasError = signal(false);
  trainers = signal<AdminTrainer[]>([]);
  activeFilter = signal<TrainerFilter>('ALL');

  pendingCount = computed(
    () => this.trainers().filter((t) => (t.trainer_status ?? 'PENDING') === 'PENDING').length,
  );

  // -- Reject modal --
  rejectTarget = signal<AdminTrainer | null>(null);
  rejectForm = this.fb.nonNullable.group({ reason: [''] });
  isRejecting = signal(false);

  // -- Details modal --
  details = signal<AdminTrainer | null>(null);
  isLoadingDetails = signal(false);
  detailsTab = signal<'info' | 'certificates' | 'documents'>('info');

  certificateForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    certificate_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
  });

  documentForm = this.fb.nonNullable.group({
    file_name: ['', Validators.required],
    file_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    file_type: ['CV'],
  });

  isAddingCertificate = signal(false);
  isAddingDocument = signal(false);
  busyId = signal<string | null>(null);

  toastError = signal<string | null>(null);
  toastSuccess = signal<string | null>(null);

  // -- Edit trainer form --
  editTarget = signal<AdminTrainer | null>(null);  isSavingTrainer = signal(false);

  editForm = this.fb.nonNullable.group({
    years_of_experience: this.fb.control<number | null>(null),
    bio_ar: [''],
    bio_en: [''],
  });

  filtered = computed(() => {
    const f = this.activeFilter();
    const list = this.trainers();
    if (f === 'ALL') return list;
    return list.filter((t) => (t.trainer_status ?? 'PENDING') === f);
  });

  statusBadge(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'badge-approved';
      case 'SUSPENDED':
        return 'badge-urgent';
      case 'REJECTED':
        return 'badge-rejected';
      default:
        return 'badge-pending';
    }
  }

  initials(name: string): string {
    return (name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  ngOnInit(): void {
    this.load();
  }

  setFilter(filter: TrainerFilter): void {
    this.activeFilter.set(filter);
  }

  // Silent re-fetch (no spinner) to reconcile with the server after mutations
  refresh(): void {
    this.load(false);
  }

  load(showSpinner = true): void {
    if (showSpinner) this.isLoading.set(true);
    this.hasError.set(false);
    this.adminService.getTrainers().subscribe({
      next: (list) => {
        this.trainers.set(list);
        this.adminUi.pendingTrainers.set(list.filter((t) => (t.trainer_status ?? 'PENDING') === 'PENDING').length);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  // ================= Status Actions =================

  act(trainer: AdminTrainer, action: 'approve' | 'suspend' | 'activate'): void {
    this.busyId.set(trainer.id);
    const request$ =
      action === 'approve'
        ? this.adminService.approveTrainer(trainer.id)
        : action === 'suspend'
          ? this.adminService.suspendTrainer(trainer.id)
          : this.adminService.activateTrainer(trainer.id);

    request$.subscribe({
      next: () => {
        this.busyId.set(null);
        this.refresh();
        this.refreshDetailsIfOpen(trainer.id);
      },
      error: () => {
        this.busyId.set(null);
        this.showError('admin_trainers.action_error');
      },
    });
  }

  // Re-fetch the open details modal content from the server
  private refreshDetailsIfOpen(trainerId: string): void {
    const current = this.details();
    if (!current || current.id !== trainerId) return;
    this.adminService.getTrainer(trainerId).subscribe({
      next: (full) => {
        if (this.details()?.id === trainerId && full) this.details.set(full);
      },
      error: () => undefined,
    });
  }

  private statusAfter(action: 'approve' | 'suspend' | 'activate'): AdminTrainer['trainer_status'] {
    if (action === 'approve' || action === 'activate') return 'APPROVED';
    return 'SUSPENDED';
  }

  private replaceTrainer(updated: AdminTrainer): void {
    this.trainers.update((list) => {
      const merged = list.map((t) => (t.id === updated.id ? { ...t, ...updated, users: updated.users ?? t.users } : t));
      this.adminUi.pendingTrainers.set(
        merged.filter((t) => (t.trainer_status ?? 'PENDING') === 'PENDING').length,
      );
      return merged;
    });
    const current = this.details();
    if (current && current.id === updated.id) {
      this.details.set({ ...current, ...updated });
    }
  }

  // ================= Reject =================

  askReject(trainer: AdminTrainer): void {
    this.rejectTarget.set(trainer);
    this.rejectForm.reset({ reason: '' });
  }

  closeReject(): void {
    this.rejectTarget.set(null);
    this.isRejecting.set(false);
  }

  confirmReject(): void {
    const target = this.rejectTarget();
    if (!target) return;
    this.isRejecting.set(true);
    this.adminService.rejectTrainer(target.id, this.rejectForm.getRawValue().reason || undefined).subscribe({
      next: () => {
        this.isRejecting.set(false);
        this.closeReject();
        this.refresh();
        this.refreshDetailsIfOpen(target.id);
      },
      error: () => {
        this.isRejecting.set(false);
        this.showError('admin_trainers.action_error');
      },
    });
  }

  // ================= Details =================

  openDetails(trainer: AdminTrainer): void {
    this.details.set(trainer);
    this.detailsTab.set('info');
    this.isLoadingDetails.set(true);
    this.adminService.getTrainer(trainer.id).subscribe({
      next: (full) => {
        this.details.set(full);
        this.isLoadingDetails.set(false);
      },
      error: () => this.isLoadingDetails.set(false),
    });
  }

  // ================= Edit trainer =================

  openEdit(trainer: AdminTrainer): void {
    this.editTarget.set(trainer);
    this.editForm.reset({
      years_of_experience: trainer.years_of_experience ?? null,
      bio_ar: trainer.bio_ar ?? '',
      bio_en: trainer.bio_en ?? '',
    });
  }

  closeEdit(): void {
    this.editTarget.set(null);
    this.isSavingTrainer.set(false);
  }

  saveEdit(): void {
    const target = this.editTarget();
    if (!target) return;
    const raw = this.editForm.getRawValue();
    this.isSavingTrainer.set(true);
    this.adminService
      .updateTrainer(target.id, {
        years_of_experience: raw.years_of_experience ?? undefined,
        bio_ar: raw.bio_ar || undefined,
        bio_en: raw.bio_en || undefined,
      })
      .subscribe({
        next: () => {
          this.isSavingTrainer.set(false);
          this.closeEdit();
          this.showToast('admin_trainers.update_success');
          this.refresh();
          this.refreshDetailsIfOpen(target.id);
        },
        error: () => {
          this.isSavingTrainer.set(false);
          this.showError('admin_trainers.update_error');
        },
      });
  }

  closeDetails(): void {
    this.details.set(null);
  }

  setDetailsTab(tab: 'info' | 'certificates' | 'documents'): void {
    this.detailsTab.set(tab);
  }

  addCertificate(): void {
    const current = this.details();
    if (!current || this.certificateForm.invalid) {
      this.certificateForm.markAllAsTouched();
      return;
    }
    this.isAddingCertificate.set(true);
    this.adminService.addTrainerCertificate(current.id, this.certificateForm.getRawValue()).subscribe({
      next: () => {
        this.certificateForm.reset();
        this.isAddingCertificate.set(false);
        this.refresh();
        this.refreshDetailsIfOpen(current.id);
      },
      error: () => {
        this.isAddingCertificate.set(false);
        this.showError('admin_trainers.cert_add_error');
      },
    });
  }

  removeCertificate(cert: AdminTrainerCertificate): void {
    const current = this.details();
    if (!current) return;
    this.adminService.deleteTrainerCertificate(cert.id).subscribe({
      next: () => {
        this.details.update((d) =>
          d
            ? {
                ...d,
                trainer_certificates: (d.trainer_certificates ?? []).filter((c) => c.id !== cert.id),
              }
            : d,
        );
        this.refresh();
      },
      error: () => this.showError('admin_trainers.cert_delete_error'),
    });
  }

  addDocument(): void {
    const current = this.details();
    if (!current || this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      return;
    }
    this.isAddingDocument.set(true);
    this.adminService.addTrainerDocument(current.id, this.documentForm.getRawValue()).subscribe({
      next: () => {
        this.documentForm.reset({ file_type: 'CV' });
        this.isAddingDocument.set(false);
        this.refresh();
        this.refreshDetailsIfOpen(current.id);
      },
      error: () => {
        this.isAddingDocument.set(false);
        this.showError('admin_trainers.doc_add_error');
      },
    });
  }

  removeDocument(doc: AdminTrainerDocument): void {
    const current = this.details();
    if (!current) return;
    this.adminService.deleteTrainerDocument(doc.id).subscribe({
      next: () => {
        this.details.update((d) =>
          d
            ? {
                ...d,
                trainer_documents: (d.trainer_documents ?? []).filter((x) => x.id !== doc.id),
              }
            : d,
        );
        this.refresh();
      },
      error: () => this.showError('admin_trainers.doc_delete_error'),
    });
  }

  specializationName(trainer: AdminTrainer): string {
    const spec = trainer.specializations;
    if (!spec) return '—';
    return `${spec.name_ar} / ${spec.name_en}`;
  }

  private showError(key: string): void {
    this.toastError.set(key);
    setTimeout(() => this.toastError.set(null), 3000);
  }

  private showToast(key: string): void {
    this.toastSuccess.set(key);
    setTimeout(() => this.toastSuccess.set(null), 3000);
  }
}
