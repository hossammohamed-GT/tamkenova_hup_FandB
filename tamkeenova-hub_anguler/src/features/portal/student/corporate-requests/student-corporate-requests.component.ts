import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CorporateRequestService } from '../../../../core/services/corporate-request.service';
import { CorporateRequest, CorporateStatus } from '../../../../core/models/student.model';
import { apiErrorKey } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-student-corporate-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './student-corporate-requests.component.html',
  styleUrls: ['../../portal-shared.css', './student-corporate-requests.component.css'],
})
export class StudentCorporateRequestsComponent {
  private fb = inject(FormBuilder);
  private corporateService = inject(CorporateRequestService);

  isLoading = signal(true);
  requests = signal<CorporateRequest[]>([]);
  activeFilter = signal<CorporateStatus | 'ALL'>('ALL');

  showForm = signal(false);
  isSubmitting = signal(false);
  formError = signal<string | null>(null);

  selected = signal<CorporateRequest | null>(null);
  loadingDetails = signal(false);

  isUploading = signal(false);
  uploadError = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  readonly statuses: Array<CorporateStatus | 'ALL'> = [
    'ALL',
    'PENDING',
    'UNDER_REVIEW',
    'ASSIGNED',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
  ];

  readonly serviceTypes = ['TRAINING', 'CONSULTING', 'CORPORATE_TRAINING', 'OTHER'];

  form = this.fb.nonNullable.group({
    contact_name: ['', Validators.required],
    contact_email: ['', [Validators.required, Validators.email]],
    contact_phone: [''],
    contact_whatsapp: [''],
    company_name: ['', Validators.required],
    sector: [''],
    country: [''],
    employees_count: this.fb.control<number | null>(null),
    service_type: ['TRAINING', Validators.required],
    service_description: ['', [Validators.required, Validators.minLength(10)]],
    expected_budget: [''],
    project_duration: [''],
  });

  filtered = computed(() => {
    const f = this.activeFilter();
    const list = this.requests();
    return f === 'ALL' ? list : list.filter((r) => r.status === f);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.corporateService.getMine().subscribe({
      next: (res) => {
        this.requests.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  setFilter(status: CorporateStatus | 'ALL'): void {
    this.activeFilter.set(status);
  }

  openForm(): void {
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.formError.set(null);

    const raw = this.form.getRawValue();
    this.corporateService
      .create({
        contact_name: raw.contact_name,
        contact_email: raw.contact_email,
        contact_phone: raw.contact_phone || undefined,
        contact_whatsapp: raw.contact_whatsapp || undefined,
        company_name: raw.company_name,
        sector: raw.sector || undefined,
        country: raw.country || undefined,
        employees_count: raw.employees_count ?? undefined,
        service_type: raw.service_type,
        service_description: raw.service_description,
        expected_budget: raw.expected_budget || undefined,
        project_duration: raw.project_duration || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeForm();
          this.form.reset({ service_type: 'TRAINING' });
          this.load();
          this.showToast('student_corporate.submit_success');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.formError.set(apiErrorKey(err, 'auth.errors.generic'));
        },
      });
  }

  openDetails(item: CorporateRequest): void {
    this.selected.set(item);
    this.loadingDetails.set(true);
    this.corporateService.getById(item.id).subscribe({
      next: (res) => {
        this.selected.set(res);
        this.loadingDetails.set(false);
      },
      error: () => this.loadingDetails.set(false),
    });
  }

  closeDetails(): void {
    this.selected.set(null);
    this.uploadError.set(null);
  }

  triggerAttachmentInput(): void {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('corp-attachment-input') as HTMLInputElement;
    input?.click();
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const current = this.selected();
    input.value = '';
    if (!file || !current) return;

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowed.includes(file.type)) {
      this.uploadError.set('student_corporate.upload_hint');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError.set('student_corporate.upload_hint');
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);
    this.corporateService.uploadAttachment(current.id, file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.selected.update((s) =>
          s ? { ...s, corporate_request_attachments: [...s.corporate_request_attachments, res.attachment] } : s,
        );
        this.showToast('student_corporate.upload_success');
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadError.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }

  private showToast(key: string): void {
    this.toastMessage.set(key);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  badgeClass(status: CorporateStatus): string {
    if (status === 'APPROVED' || status === 'COMPLETED') return 'badge-approved';
    if (status === 'PENDING' || status === 'UNDER_REVIEW' || status === 'ASSIGNED')
      return 'badge-pending';
    return 'badge-rejected';
  }
}
