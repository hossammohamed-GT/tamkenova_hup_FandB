import { CertificateLogoService } from '../../../../core/certificates/certificate-logo.service';
import { PartnersService } from '../../../../core/services/partners.service';
import { StrategicPartner } from '../../../../core/models/partner.model';
import { ThemeService } from '../../../../core/services/theme.service';
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
  CertificateLanguage,
  PartnerLogo,
  MAX_PARTNER_LOGOS,
  canRenderCertificate,
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
  private partnersService = inject(PartnersService);
  private logoService = inject(CertificateLogoService);
  private theme = inject(ThemeService);
  readonly certificateTypes: TemplateType[] = ['TRAINING', 'VOLUNTEER'];
  readonly languages: CertificateLanguage[] = ['ar', 'en'];
  readonly maxLogos = MAX_PARTNER_LOGOS;
  readonly canRender = canRenderCertificate;
  partners = signal<StrategicPartner[]>([]);
  partnersLoading = signal(false);
  partnersError = signal(false);
  selectedLogos = signal<PartnerLogo[]>([]);
  logoBusy = signal(false);
  logoError = signal<string | null>(null);
  private logoRevision = 0;
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
    certificate_language: this.fb.nonNullable.control<CertificateLanguage>(this.theme.language()),
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
    this.loadPartners();
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
  openIssue(
    type: TemplateType = 'TRAINING',
    language: CertificateLanguage = this.theme.language(),
  ): void {
    this.resetLogos([]);
    this.editTarget.set(null);
    this.selectedUser.set(null);
    this.userResults.set([]);
    this.userSearchTerm.set('');
    this.formError.set(null);
    this.issueForm.reset({
      certificate_type: type,
      certificate_language: language,
      issued_at: this.today(),
    });
    this.showIssueModal.set(true);
    void this.updatePreview();
  }
  openEdit(cert: AdminCertificate): void {
    this.resetLogos(cert.template_version === this.version ? (cert.partner_logos ?? []) : []);
    this.editTarget.set(cert);
    this.selectedUser.set(null);
    this.formError.set(null);
    this.issueForm.reset({
      certificate_type: cert.certificate_type === 'VOLUNTEER' ? 'VOLUNTEER' : 'TRAINING',
      certificate_language: cert.certificate_language ?? this.theme.language(),
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
    this.logoRevision++;
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

  loadPartners(): void {
    this.partnersLoading.set(true);
    this.partnersError.set(false);
    this.partnersService.listAll().subscribe({
      next: (partners) => {
        this.partners.set(partners.filter((p) => p.is_active));
        this.partnersLoading.set(false);
      },
      error: () => {
        this.partnersError.set(true);
        this.partnersLoading.set(false);
      },
    });
  }
  selectLanguage(language: CertificateLanguage): void {
    this.issueForm.controls.certificate_language.setValue(language);
  }
  private resetLogos(logos: PartnerLogo[]): void {
    this.logoRevision++;
    this.selectedLogos.set(logos.map((logo) => ({ ...logo })));
    this.logoBusy.set(false);
    this.logoError.set(null);
  }
  isPartnerSelected(id: string): boolean {
    return this.selectedLogos().some((logo) => logo.source_id === id);
  }
  async togglePartner(partner: StrategicPartner): Promise<void> {
    if (this.logoBusy() || this.isSaving()) return;
    const existing = this.selectedLogos().findIndex((logo) => logo.source_id === partner.id);
    if (existing >= 0) {
      this.removeLogo(existing);
      return;
    }
    if (this.selectedLogos().length >= this.maxLogos) {
      this.logoError.set('certificate_studio.partner_limit');
      return;
    }
    const revision = this.logoRevision;
    this.logoBusy.set(true);
    this.logoError.set(null);
    try {
      const name =
        this.issueForm.controls.certificate_language.value === 'ar'
          ? partner.name_ar
          : partner.name_en;
      const logo = await this.logoService.fromLibrary(partner.logo_url, name, partner.id);
      if (revision === this.logoRevision) this.appendLogos([logo]);
    } catch (error) {
      if (revision === this.logoRevision)
        this.logoError.set(
          error instanceof Error && error.message === 'certificate_studio.partner_invalid'
            ? error.message
            : 'certificate_studio.partner_load_error',
        );
    } finally {
      if (revision === this.logoRevision) this.logoBusy.set(false);
    }
  }
  async uploadLogos(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || this.logoBusy() || this.isSaving()) return;
    if (files.length + this.selectedLogos().length > this.maxLogos) {
      this.logoError.set('certificate_studio.partner_limit');
      return;
    }
    const revision = this.logoRevision;
    this.logoBusy.set(true);
    this.logoError.set(null);
    try {
      const logos = await Promise.all(files.map((file) => this.logoService.fromFile(file)));
      if (revision === this.logoRevision) this.appendLogos(logos);
    } catch {
      if (revision === this.logoRevision) this.logoError.set('certificate_studio.partner_invalid');
    } finally {
      if (revision === this.logoRevision) this.logoBusy.set(false);
    }
  }
  private appendLogos(logos: PartnerLogo[]): void {
    const all = [...this.selectedLogos(), ...logos];
    if (new Set(all.map((logo) => logo.data_url)).size !== all.length) {
      this.logoError.set('certificate_studio.partner_duplicate');
      return;
    }
    this.selectedLogos.set(all);
    void this.updatePreview();
  }
  removeLogo(index: number): void {
    if (this.logoBusy() || this.isSaving()) return;
    this.selectedLogos.update((logos) => logos.filter((_, i) => i !== index));
    this.logoError.set(null);
    void this.updatePreview();
  }
  moveLogo(index: number, step: number): void {
    if (
      this.logoBusy() ||
      this.isSaving() ||
      index + step < 0 ||
      index + step >= this.selectedLogos().length
    )
      return;
    this.selectedLogos.update((logos) => {
      const list = [...logos];
      [list[index], list[index + step]] = [list[index + step], list[index]];
      return list;
    });
    void this.updatePreview();
  }

  private values(preview: boolean): CertificateValues {
    const raw = this.issueForm.getRawValue();
    return {
      ...raw,
      template_version: TEMPLATE_VERSION,
      partner_logos: this.selectedLogos(),
      recipient_name:
        raw.recipient_name.trim() ||
        (preview ? (raw.certificate_language === 'ar' ? 'اسم المستلم' : 'Recipient name') : ''),
      program_name:
        raw.certificate_type === 'TRAINING'
          ? raw.program_name.trim() ||
            (preview ? (raw.certificate_language === 'ar' ? 'اسم البرنامج' : 'Program name') : '')
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
    if (this.isSaving() || this.logoBusy() || this.logoError()) return;
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
      const { verification_code: _code, template_version: _version, ...fields } = values;
      const payload = {
        ...fields,
        certificate_language: this.issueForm.controls.certificate_language.value,
        program_name: fields.program_name ?? null,
      };
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
