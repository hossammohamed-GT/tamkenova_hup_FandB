import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component.js';
import { AuthService } from '../../core/services/auth.service';
import { CorporateRequestService } from '../../core/services/corporate-request.service';
import { ConsultationService } from '../../core/services/consultation.service';
import { StudentService } from '../../core/services/student.service';
import { TrainerListItem } from '../../core/models/student.model';
import { apiErrorKey } from '../../core/utils/api-error';

type AudienceType = 'b2b' | 'b2c';
type ContactMethod = 'whatsapp' | 'phone' | 'email';

@Component({
  selector: 'app-consulting',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, RouterLink, PageHeaderComponent],
  templateUrl: './consulting.component.html',
  styleUrl: './consulting.component.css',
})
export class ConsultingComponent {
  private authService = inject(AuthService);
  private corporateService = inject(CorporateRequestService);
  private consultationService = inject(ConsultationService);
  private studentService = inject(StudentService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  isLoggedIn = this.authService.isLoggedIn;
  isStudent = this.authService.isStudent;
  currentUser = this.authService.currentUser;

  audience = signal<AudienceType>('b2b');

  // -- B2B fields --
  b2b = {
    contact_name: signal(''),
    contact_email: signal(''),
    contact_phone: signal(''),
    contact_whatsapp: signal(''),
    company_name: signal(''),
    sector: signal(''),
    country: signal(''),
    employees_count: signal<number | null>(null),
    service_type: signal('TRAINING'),
    service_description: signal(''),
    expected_budget: signal(''),
    project_duration: signal(''),
  };

  serviceTypes = ['TRAINING', 'CONSULTING', 'CORPORATE_TRAINING', 'OTHER'];

  // -- B2C fields --
  b2c = {
    trainer_id: signal(''),
    trainer_search: signal(''),
    title: signal(''),
    description: signal(''),
    preferred_date: signal(''),
    preferred_time: signal(''),
    contact_phone: signal(''),
    contact_method: signal<ContactMethod>('whatsapp'),
    student_notes: signal(''),
  };

  trainers = signal<TrainerListItem[]>([]);
  filteredTrainers = computed(() => {
    const search = this.b2c.trainer_search().toLowerCase().trim();
    if (!search) return this.trainers().slice(0, 8);
    return this.trainers()
      .filter((t) => t.users.full_name.toLowerCase().includes(search) || (t.specializations?.name_ar ?? '').toLowerCase().includes(search))
      .slice(0, 8);
  });

  selectedTrainer = computed(() => {
    const id = this.b2c.trainer_id();
    if (!id) return null;
    return this.trainers().find((t) => t.id === id) ?? null;
  });

  // -- UI state --
  submitting = signal(false);
  submitted = signal(false);
  submittedRequestId = signal<string | null>(null);
  touched = signal(false);
  submitError = signal<string | null>(null);
  attachmentFile = signal<File | null>(null);
  isUploading = signal(false);
  uploadSuccess = signal(false);

  get isArabic(): boolean {
    return this.translate.currentLang() !== 'en';
  }

  isB2BValid = computed(() => {
    return (
      this.b2b.company_name().trim() !== '' &&
      this.b2b.contact_name().trim() !== '' &&
      this.b2b.contact_email().trim() !== '' &&
      this.b2b.service_description().trim() !== '' &&
      this.b2b.service_type().trim() !== ''
    );
  });

  isB2CValid = computed(() => {
    return (
      this.b2c.trainer_id().trim() !== '' &&
      this.b2c.title().trim() !== '' &&
      this.b2c.description().trim() !== ''
    );
  });

  constructor() {
    // preload trainers for B2C
    this.studentService.getTrainers({ limit: 50 }).subscribe({
      next: (res) => this.trainers.set(res.data ?? []),
      error: () => undefined,
    });

    // prefill email from user
    const user = this.currentUser();
    if (user) {
      this.b2b.contact_email.set(user.email ?? '');
      this.b2b.contact_name.set(user.full_name ?? '');
      this.b2b.contact_phone.set(user.phone ?? '');
      this.b2c.contact_phone.set(user.phone ?? '');
    }
  }

  setAudience(type: AudienceType): void {
    this.audience.set(type);
    this.touched.set(false);
    this.submitError.set(null);
    this.submitted.set(false);
  }

  selectTrainer(t: TrainerListItem): void {
    this.b2c.trainer_id.set(t.id);
    this.b2c.trainer_search.set(t.users.full_name);
  }

  submit(): void {
    this.touched.set(true);
    if (this.submitting()) return;

    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.audience() === 'b2b') {
      if (!this.isB2BValid()) return;
      this.submitB2B();
    } else {
      if (!this.isB2CValid()) return;
      this.submitB2C();
    }
  }

  private submitB2B(): void {
    this.submitting.set(true);
    this.submitError.set(null);

    this.corporateService
      .create({
        contact_name: this.b2b.contact_name().trim(),
        contact_email: this.b2b.contact_email().trim(),
        contact_phone: this.b2b.contact_phone().trim() || undefined,
        contact_whatsapp: this.b2b.contact_whatsapp().trim() || undefined,
        company_name: this.b2b.company_name().trim(),
        sector: this.b2b.sector().trim() || undefined,
        country: this.b2b.country().trim() || undefined,
        employees_count: this.b2b.employees_count() || undefined,
        service_type: this.b2b.service_type(),
        service_description: this.b2b.service_description().trim(),
        expected_budget: this.b2b.expected_budget().trim() || undefined,
        project_duration: this.b2b.project_duration().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.submitted.set(true);
          this.submittedRequestId.set(res.request?.id ?? null);
        },
        error: (err) => {
          this.submitting.set(false);
          this.submitError.set(apiErrorKey(err, 'auth.errors.generic'));
        },
      });
  }

  private submitB2C(): void {
    if (!this.isStudent()) {
      this.submitError.set('booking.trainer_notice');
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);

    this.consultationService
      .create({
        trainer_id: this.b2c.trainer_id(),
        title: this.b2c.title().trim(),
        description: this.b2c.description().trim(),
        preferred_date: this.b2c.preferred_date() || undefined,
        preferred_time: this.b2c.preferred_time() || undefined,
        contact_phone: this.b2c.contact_phone().trim() || undefined,
        preferred_contact_method: this.b2c.contact_method(),
        student_notes: this.b2c.student_notes().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          this.submitError.set(apiErrorKey(err, 'auth.errors.generic'));
        },
      });
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.submitError.set('student_corporate.upload_hint');
      return;
    }
    this.attachmentFile.set(file);
    this.uploadAttachment();
  }

  uploadAttachment(): void {
    const file = this.attachmentFile();
    const reqId = this.submittedRequestId();
    if (!file || !reqId) return;
    this.isUploading.set(true);
    this.corporateService.uploadAttachment(reqId, file).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.uploadSuccess.set(true);
        this.attachmentFile.set(null);
        setTimeout(() => this.uploadSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isUploading.set(false);
        this.submitError.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }

  triggerAttachmentInput(): void {
    if (typeof document === 'undefined') return;
    document.getElementById('consulting-attachment-input')?.click();
  }

  resetForm(): void {
    this.b2b.contact_name.set('');
    this.b2b.contact_email.set('');
    this.b2b.contact_phone.set('');
    this.b2b.contact_whatsapp.set('');
    this.b2b.company_name.set('');
    this.b2b.sector.set('');
    this.b2b.country.set('');
    this.b2b.employees_count.set(null);
    this.b2b.service_type.set('TRAINING');
    this.b2b.service_description.set('');
    this.b2b.expected_budget.set('');
    this.b2b.project_duration.set('');
    this.b2c.trainer_id.set('');
    this.b2c.trainer_search.set('');
    this.b2c.title.set('');
    this.b2c.description.set('');
    this.b2c.preferred_date.set('');
    this.b2c.preferred_time.set('');
    this.b2c.contact_phone.set('');
    this.b2c.contact_method.set('whatsapp');
    this.b2c.student_notes.set('');
    this.touched.set(false);
    this.submitted.set(false);
    this.submittedRequestId.set(null);
    this.submitError.set(null);
    this.attachmentFile.set(null);
    const user = this.currentUser();
    if (user) {
      this.b2b.contact_email.set(user.email ?? '');
      this.b2b.contact_name.set(user.full_name ?? '');
      this.b2b.contact_phone.set(user.phone ?? '');
      this.b2c.contact_phone.set(user.phone ?? '');
    }
  }

  goToMyRequests(): void {
    this.router.navigate(['/portal/student/corporate-requests']);
  }

  goToMyConsultations(): void {
    this.router.navigate(['/portal/student/consultations']);
  }

  goToTrainers(): void {
    this.router.navigate(['/portal/student/trainers']);
  }
}
