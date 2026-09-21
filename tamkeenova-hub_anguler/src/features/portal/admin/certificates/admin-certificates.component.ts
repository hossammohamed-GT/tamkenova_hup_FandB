import { CertificateDialogDirective } from '../../../../core/certificates/certificate-dialog.directive';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, firstValueFrom, tap } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../../core/services/admin.service';
import {
  AdminCertificate,
  AdminUser,
  IssueCertificatePayload,
} from '../../../../core/models/admin.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { apiErrorKey } from '../../../../core/utils/api-error';
import { CertificateRenderer } from '../../../../core/certificates/certificate-renderer.service';
import {
  CERTIFICATE_TEMPLATES,
  CertificateValues,
  TEMPLATE_VERSION,
  TemplateType,
  certificateValues,
} from '../../../../core/certificates/certificate-template';

@Component({
  selector: 'app-admin-certificates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    AdminNavComponent,
    CertificateDialogDirective,
  ],
  templateUrl: './admin-certificates.component.html',
  styleUrls: [
    '../../portal-shared.css',
    '../../staff-shared.css',
    './admin-certificates.component.css',
  ],
})
export class AdminCertificatesComponent implements OnInit {
  private adminService = inject(AdminService);
  private renderer = inject(CertificateRenderer);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  readonly templates = CERTIFICATE_TEMPLATES;
  readonly version = TEMPLATE_VERSION;
  isLoading = signal(true);
  hasError = signal(false);
  certificates = signal<AdminCertificate[]>([]);
  search = signal('');
  showIssueModal = signal(false);
  editTarget = signal<AdminCertificate | null>(null);
  isSaving = signal(false);
  formError = signal<string | null>(null);
  userResults = signal<AdminUser[]>([]);
  userSearchTerm = signal('');
  isSearchingUsers = signal(false);
  selectedUser = signal<AdminUser | null>(null);
  deleteTarget = signal<AdminCertificate | null>(null);
  isDeleting = signal(false);
  downloadingId = signal<string | null>(null);
  toast = signal<{ key: string; error?: boolean } | null>(null);
  preview = signal<string | null>(null);
  previewError = signal<string | null>(null);
  previewBusy = signal(false);
  private previewRevision = 0;
  private searchRevision = 0;

  issueForm = this.fb.nonNullable.group({
    certificate_type: this.fb.nonNullable.control<TemplateType>('TRAINING'),
    recipient_name: ['', [Validators.required, Validators.maxLength(120)]],
    program_name: ['', Validators.maxLength(180)],
    training_hours: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(100000),
      Validators.pattern(/^\d+$/),
    ]),
    issued_at: [this.today(), Validators.required],
  });

  filtered = computed(() => {
    const term = this.search().toLowerCase();
    return this.certificates().filter(
      (c) =>
        !term ||
        [c.title, c.recipient_name, c.verification_code, c.users?.full_name].some((v) =>
          v?.toLowerCase().includes(term),
        ),
    );
  });

  constructor() {
    this.issueForm.valueChanges
      .pipe(
        tap(() => {
          if (this.showIssueModal()) {
            this.previewRevision++;
            this.previewBusy.set(true);
          }
        }),
        debounceTime(250),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.showIssueModal()) void this.updatePreview();
      });
  }
  ngOnInit(): void {
    this.load();
  }
  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  initials(name: string): string {
    return (name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }
  typeBadge(type: string | null | undefined): string {
    return type === 'VOLUNTEER' ? 'badge-approved' : 'badge-info';
  }
  onSearch(value: string): void {
    this.search.set(value);
  }
  load(): void {
    this.isLoading.set(true);
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
  openIssue(type: TemplateType = 'TRAINING'): void {
    this.editTarget.set(null);
    this.selectedUser.set(null);
    this.userResults.set([]);
    this.userSearchTerm.set('');
    this.formError.set(null);
    this.issueForm.reset({ certificate_type: type, issued_at: this.today() });
    this.showIssueModal.set(true);
    void this.updatePreview();
  }
  openEdit(cert: AdminCertificate): void {
    this.editTarget.set(cert);
    this.selectedUser.set(null);
    this.formError.set(null);
    this.issueForm.reset({
      certificate_type: cert.certificate_type === 'VOLUNTEER' ? 'VOLUNTEER' : 'TRAINING',
      recipient_name: cert.recipient_name ?? cert.users?.full_name ?? '',
      program_name: cert.program_name ?? (cert.certificate_type === 'TRAINING' ? cert.title : ''),
      training_hours: cert.training_hours,
      issued_at: cert.issued_at.slice(0, 10),
    });
    this.showIssueModal.set(true);
    void this.updatePreview();
  }
  closeIssue(): void {
    if (this.isSaving()) return;
    this.showIssueModal.set(false);
    this.previewRevision++;
    this.preview.set(null);
    this.editTarget.set(null);
  }
  selectTemplate(type: TemplateType): void {
    this.issueForm.controls.certificate_type.setValue(type);
    if (type === 'VOLUNTEER') this.issueForm.controls.program_name.setValue('');
    void this.updatePreview();
  }
  searchUsers(term: string): void {
    const revision = ++this.searchRevision;
    const query = term.trim();
    this.userSearchTerm.set(query);
    this.userResults.set([]);
    if (query.length < 2) {
      this.isSearchingUsers.set(false);
      return;
    }
    this.isSearchingUsers.set(true);
    this.adminService.getUsers({ search: query, limit: 6 }).subscribe({
      next: (res) => {
        if (revision !== this.searchRevision) return;
        this.userResults.set(res?.data ?? []);
        this.isSearchingUsers.set(false);
      },
      error: () => {
        if (revision === this.searchRevision) this.isSearchingUsers.set(false);
      },
    });
  }
  pickUser(user: AdminUser): void {
    this.searchRevision++;
    this.isSearchingUsers.set(false);
    this.selectedUser.set(user);
    this.userResults.set([]);
    this.userSearchTerm.set('');
    this.issueForm.controls.recipient_name.setValue(user.full_name);
  }
  clearUser(): void {
    this.selectedUser.set(null);
  }

  private values(preview: boolean): CertificateValues {
    const raw = this.issueForm.getRawValue();
    return {
      ...raw,
      recipient_name: raw.recipient_name.trim() || (preview ? 'Recipient name · اسم المستلم' : ''),
      program_name:
        raw.certificate_type === 'TRAINING'
          ? raw.program_name.trim() || (preview ? 'Program name · اسم البرنامج' : '')
          : null,
      training_hours: raw.training_hours ?? (preview ? 1 : 0),
      verification_code: this.editTarget()?.verification_code ?? 'PREVIEW-NOT-ISSUED',
    };
  }
  async updatePreview(): Promise<void> {
    const revision = ++this.previewRevision;
    this.previewBusy.set(true);
    this.previewError.set(null);
    try {
      const canvas = await this.renderer.render(this.values(true), 1400);
      if (revision === this.previewRevision) this.preview.set(canvas.toDataURL('image/png'));
    } catch (error) {
      if (revision === this.previewRevision) {
        this.preview.set(null);
        this.previewError.set(this.renderError(error));
      }
    } finally {
      if (revision === this.previewRevision) this.previewBusy.set(false);
    }
  }
  async save(): Promise<void> {
    if (this.isSaving()) return;
    this.issueForm.markAllAsTouched();
    if (this.issueForm.invalid) {
      this.formError.set('certificate_studio.invalid');
      return;
    }
    if (!this.editTarget() && !this.selectedUser()) {
      this.formError.set('admin_certificates.user_required');
      return;
    }
    this.isSaving.set(true);
    this.formError.set(null);
    try {
      const values = this.values(false);
      // Do not issue a document if fonts, artwork or text fitting fail.
      await this.renderer.render(values, 900);
      const { verification_code: _code, ...fields } = values;
      const payload = { ...fields, program_name: fields.program_name ?? null };
      const editing = this.editTarget();
      const record = editing
        ? await firstValueFrom(this.adminService.updateCertificate(editing.id, payload))
        : await firstValueFrom(
            this.adminService.issueCertificate({
              ...payload,
              user_id: this.selectedUser()!.id,
            } as IssueCertificatePayload),
          );
      if (record?.id)
        this.certificates.update((list) =>
          editing
            ? list.map((c) => (c.id === record.id ? { ...c, ...record } : c))
            : [record, ...list],
        );
      else this.load();
      this.isSaving.set(false);
      this.closeIssue();
      this.showToast(editing ? 'admin_certificates.updated' : 'admin_certificates.issued');
    } catch (error) {
      this.isSaving.set(false);
      this.formError.set(
        error instanceof Error && error.message.startsWith('certificate_studio.')
          ? error.message
          : apiErrorKey(error, 'admin_certificates.save_error'),
      );
    }
  }
  async download(cert: AdminCertificate): Promise<void> {
    if (this.downloadingId()) return;
    this.downloadingId.set(cert.id);
    try {
      await this.renderer.download(certificateValues(cert));
    } catch (error) {
      this.showToast(this.renderError(error), true);
    } finally {
      this.downloadingId.set(null);
    }
  }
  private renderError(error: unknown): string {
    return error instanceof Error && error.message.startsWith('certificate_studio.')
      ? error.message
      : 'certificate_studio.render_error';
  }
  revoke(cert: AdminCertificate): void {
    this.adminService.revokeCertificate(cert.id).subscribe({
      next: () => {
        this.certificates.update((list) =>
          list.map((c) => (c.id === cert.id ? { ...c, is_valid: false } : c)),
        );
        this.showToast('admin_certificates.revoked');
      },
      error: (err) => this.showToast(apiErrorKey(err, 'admin_certificates.revoke_error'), true),
    });
  }
  askDelete(cert: AdminCertificate): void {
    this.deleteTarget.set(cert);
  }
  closeDelete(): void {
    if (!this.isDeleting()) this.deleteTarget.set(null);
  }
  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.adminService.deleteCertificate(target.id).subscribe({
      next: () => {
        this.certificates.update((list) => list.filter((c) => c.id !== target.id));
        this.isDeleting.set(false);
        this.closeDelete();
        this.showToast('admin_certificates.deleted');
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.showToast(apiErrorKey(err, 'admin_certificates.delete_error'), true);
      },
    });
  }
  async copyCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.showToast('common.copied');
    } catch {
      /* Optional clipboard. */
    }
  }
  private showToast(key: string, error = false): void {
    this.toast.set({ key, error });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
