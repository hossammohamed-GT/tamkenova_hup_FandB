import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminCertificate, AdminUser, CertificateType } from '../../../../core/models/admin.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { apiErrorKey } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-admin-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent],
  templateUrl: './admin-certificates.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-certificates.component.css'],
})
export class AdminCertificatesComponent implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);

  readonly certificateTypes: CertificateType[] = ['TRAINING', 'VOLUNTEER', 'OTHER'];

  isLoading = signal(true);
  hasError = signal(false);
  certificates = signal<AdminCertificate[]>([]);
  search = signal('');

  // -- Issue / edit modal --
  showIssueModal = signal(false);
  editTarget = signal<AdminCertificate | null>(null);
  isSaving = signal(false);
  formError = signal<string | null>(null);

  // -- User picker --
  userResults = signal<AdminUser[]>([]);
  userSearchTerm = signal('');
  isSearchingUsers = signal(false);
  selectedUser = signal<AdminUser | null>(null);

  // -- Delete confirm --
  deleteTarget = signal<AdminCertificate | null>(null);
  isDeleting = signal(false);

  // -- Upload --
  uploadingId = signal<string | null>(null);

  toast = signal<{ key: string; error?: boolean } | null>(null);

  issueForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    training_hours: this.fb.control<number | null>(null),
    certificate_type: this.fb.nonNullable.control<CertificateType>('TRAINING'),
  });

  filtered = computed(() => {
    const term = this.search().toLowerCase();
    const list = this.certificates();
    if (!term) return list;
    return list.filter(
      (c) =>
        (c.title ?? '').toLowerCase().includes(term) ||
        (c.verification_code ?? '').toLowerCase().includes(term) ||
        (c.users?.full_name ?? '').toLowerCase().includes(term),
    );
  });

  typeBadge(type: string | null | undefined): string {
    switch (type) {
      case 'VOLUNTEER':
        return 'badge-approved';
      case 'TRAINING':
        return 'badge-info';
      default:
        return 'badge-neutral';
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

  // Silent re-fetch (no spinner) to reconcile with the server after mutations
  refresh(): void {
    this.load(false);
  }

  load(showSpinner = true): void {
    if (showSpinner) this.isLoading.set(true);
    this.hasError.set(false);
    this.adminService.getCertificates().subscribe({
      next: (list) => {
        this.certificates.set(list);
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

  // ================= Issue / Edit =================

  openIssue(): void {
    this.editTarget.set(null);
    this.selectedUser.set(null);
    this.userResults.set([]);
    this.userSearchTerm.set('');
    this.formError.set(null);
    this.issueForm.reset({ certificate_type: 'TRAINING' });
    this.showIssueModal.set(true);
  }

  openEdit(cert: AdminCertificate): void {
    this.editTarget.set(cert);
    this.selectedUser.set(
      cert.users
        ? {
            id: cert.user_id,
            full_name: cert.users.full_name,
            username: cert.users.username ?? null,
            email: cert.users.email,
            phone: null,
            role: 'STUDENT',
            profile_image: cert.users.profile_image ?? null,
            email_verified: true,
            is_active: true,
            created_at: cert.created_at,
          }
        : null,
    );
    this.formError.set(null);
    this.issueForm.reset({
      title: cert.title,
      description: cert.description ?? '',
      training_hours: cert.training_hours ?? null,
      certificate_type: cert.certificate_type ?? 'OTHER',
    });
    this.showIssueModal.set(true);
  }

  closeIssue(): void {
    this.showIssueModal.set(false);
    this.editTarget.set(null);
    this.isSaving.set(false);
  }

  searchUsers(term: string): void {
    const query = term.trim();
    this.userSearchTerm.set(query);
    if (query.length < 2) {
      this.userResults.set([]);
      return;
    }
    this.isSearchingUsers.set(true);
    this.adminService.getUsers({ search: query, limit: 6 }).subscribe({
      next: (res) => {
        this.userResults.set(res?.data ?? []);
        this.isSearchingUsers.set(false);
      },
      error: () => {
        this.isSearchingUsers.set(false);
      },
    });
  }

  pickUser(user: AdminUser): void {
    this.selectedUser.set(user);
    this.userResults.set([]);
    this.userSearchTerm.set('');
  }

  clearUser(): void {
    this.selectedUser.set(null);
  }

  save(): void {
    if (this.issueForm.invalid) {
      this.issueForm.markAllAsTouched();
      this.formError.set('admin_certificates.form_error');
      return;
    }

    const raw = this.issueForm.getRawValue();
    this.isSaving.set(true);
    this.formError.set(null);

    if (this.editTarget()) {
      const cert = this.editTarget()!;
      this.adminService
        .updateCertificate(cert.id, {
          title: raw.title,
          description: raw.description || undefined,
          training_hours: raw.training_hours ?? undefined,
          certificate_type: raw.certificate_type,
        })
        .subscribe({
          next: (updated) => {
            if (updated?.id) {
              this.certificates.update((list) => list.map((c) => (c.id === cert.id ? { ...c, ...updated } : c)));
            } else {
              this.load();
            }
            this.isSaving.set(false);
            this.closeIssue();
            this.showToast('admin_certificates.updated');
            this.refresh();
          },
          error: (err) => {
            this.isSaving.set(false);
            this.formError.set(this.errorMessage(err, 'admin_certificates.save_error'));
          },
        });
      return;
    }

    const user = this.selectedUser();
    if (!user) {
      this.isSaving.set(false);
      this.formError.set('admin_certificates.user_required');
      return;
    }

    this.adminService
      .issueCertificate({
        user_id: user.id,
        title: raw.title,
        description: raw.description || undefined,
        training_hours: raw.training_hours ?? undefined,
        certificate_type: raw.certificate_type,
      })
      .subscribe({
        next: (created) => {
          if (created) this.certificates.update((list) => [created, ...list]);
          else this.load();
          this.isSaving.set(false);
          this.closeIssue();
          this.showToast('admin_certificates.issued');
          this.refresh();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.formError.set(this.errorMessage(err, 'admin_certificates.save_error'));
        },
      });
  }

  // ================= PDF Upload =================

  triggerPdfInput(certId: string): void {
    if (typeof document === 'undefined') return;
    const input = document.getElementById(`cert-pdf-input-${certId}`) as HTMLInputElement | null;
    input?.click();
  }

  onPdfSelected(event: Event, cert: AdminCertificate): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.showToast('admin_certificates.pdf_only', true);
      return;
    }
    this.uploadingId.set(cert.id);
    this.adminService.uploadCertificatePdf(cert.id, file).subscribe({
      next: (updated) => {
        if (updated?.id) {
          this.certificates.update((list) => list.map((c) => (c.id === cert.id ? { ...c, ...updated } : c)));
        } else {
          this.load();
        }
        this.uploadingId.set(null);
        this.showToast('admin_certificates.pdf_uploaded');
        this.refresh();
      },
      error: (err) => {
        this.uploadingId.set(null);
        this.showToast(apiErrorKey(err, 'admin_certificates.pdf_error'), true);
      },
    });
  }

  // ================= Revoke / Delete =================

  revoke(cert: AdminCertificate): void {
    this.adminService.revokeCertificate(cert.id).subscribe({
      next: () => {
        this.certificates.update((list) =>
          list.map((c) => (c.id === cert.id ? { ...c, is_valid: false } : c)),
        );
        this.showToast('admin_certificates.revoked');
        this.refresh();
      },
      error: (err) => this.showToast(apiErrorKey(err, 'admin_certificates.revoke_error'), true),
    });
  }

  askDelete(cert: AdminCertificate): void {
    this.deleteTarget.set(cert);
  }

  closeDelete(): void {
    this.deleteTarget.set(null);
    this.isDeleting.set(false);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.isDeleting.set(true);
    this.adminService.deleteCertificate(target.id).subscribe({
      next: () => {
        this.certificates.update((list) => list.filter((c) => c.id !== target.id));
        this.isDeleting.set(false);
        this.closeDelete();
        this.showToast('admin_certificates.deleted');
        this.refresh();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.showToast(apiErrorKey(err, 'admin_certificates.delete_error'), true);
      },
    });
  }

  copyCode(code: string): void {
    try {
      void navigator.clipboard?.writeText(code);
      this.showToast('common.copied');
    } catch {
      // clipboard unavailable
    }
  }

  private errorMessage(err: unknown, fallbackKey: string): string {
    return apiErrorKey(err, fallbackKey);
  }

  private showToast(key: string, error = false): void {
    this.toast.set({ key, error });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
