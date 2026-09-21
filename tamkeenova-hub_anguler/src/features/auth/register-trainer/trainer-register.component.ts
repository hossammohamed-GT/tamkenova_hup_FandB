import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { SpecializationService } from '../../../core/services/specialization.service';
import { Specialization } from '../../../core/models/specialization.model';
import { AuthVisualPanelComponent } from '../../../shared/components/auth-visual-panel/auth-visual-panel.component';
import { PASSWORD_REQUIREMENTS, passwordScore } from '../../../core/utils/password-strength';
import { apiErrorKey } from '../../../core/utils/api-error';

const URL_PATTERN = /^https?:\/\/.+/;

@Component({
  selector: 'app-trainer-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, AuthVisualPanelComponent],
  templateUrl: './trainer-register.component.html',
  styleUrls: ['../auth-shared.css', './trainer-register.component.css'],
})
export class TrainerRegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private specializationService = inject(SpecializationService);
  private router = inject(Router);

  readonly totalSteps = 3;
  currentStep = signal(1);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  passwordValue = signal('');

  specializations = signal<Specialization[]>([]);
  specializationsLoading = signal(true);
  specializationsError = signal(false);

  private touchedFields = signal<Set<string>>(new Set());
  // Backend error tied to a specific field (e.g. email exists) — shown inline
  // under that field, with the wizard jumping back to the step that owns it.
  serverFieldError = signal<{ field: string; key: string } | null>(null);

  readonly passwordRequirements = PASSWORD_REQUIREMENTS;

  private readonly step1Fields = [
    'full_name',
    'username',
    'email',
    'phone',
    'password',
    'specialization_id',
  ];
  private readonly step2Fields = [
    'bio_ar',
    'bio_en',
    'description_ar',
    'description_en',
    'cover_letter',
  ];
  private readonly step3Fields = [
    'linkedin_url',
    'facebook_url',
    'website_url',
    'portfolio_url',
    'consultation_price_from',
    'consultation_price_to',
    'consultation_duration',
  ];

  form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    username: ['', [Validators.pattern(/^[a-zA-Z0-9_]{3,20}$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^01[0125]\d{8}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    specialization_id: ['', [Validators.required]],

    bio_ar: [''],
    bio_en: [''],
    description_ar: [''],
    description_en: [''],
    cover_letter: [''],

    linkedin_url: ['', [Validators.pattern(URL_PATTERN)]],
    facebook_url: ['', [Validators.pattern(URL_PATTERN)]],
    website_url: ['', [Validators.pattern(URL_PATTERN)]],
    portfolio_url: ['', [Validators.pattern(URL_PATTERN)]],
    consultation_price_from: this.fb.control<number | null>(null),
    consultation_price_to: this.fb.control<number | null>(null),
    consultation_duration: this.fb.control<number | null>(null),
  });

  certificateUrls = new FormArray<FormControl<string>>([]);
  documents = new FormArray<
    FormGroup<{
      file_name: FormControl<string>;
      file_url: FormControl<string>;
      file_type: FormControl<string>;
    }>
  >([]);

  passwordScore = computed(() => passwordScore(this.passwordValue()));

  strengthLevel = computed<'weak' | 'fair' | 'strong'>(() => {
    const score = this.passwordScore();
    if (score <= 1) return 'weak';
    if (score <= 3) return 'fair';
    return 'strong';
  });

  isRequirementMet(test: (v: string) => boolean): boolean {
    return test(this.passwordValue());
  }

  constructor() {
    this.specializationService.getAll().subscribe({
      next: (list) => {
        this.specializations.set(list);
        this.specializationsLoading.set(false);
      },
      error: () => {
        this.specializationsLoading.set(false);
        this.specializationsError.set(true);
      },
    });
  }

  markTouched(field: string): void {
    const serverError = this.serverFieldError();
    if (serverError && serverError.field === field) this.serverFieldError.set(null);
    if (!this.touchedFields().has(field)) {
      this.touchedFields.update((set) => new Set(set).add(field));
    }
  }

  isTouched(field: string): boolean {
    return this.touchedFields().has(field);
  }

  isFieldValid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.valid && this.isTouched(field) && !!control.value;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && this.isTouched(field);
  }

  onPasswordInput(value: string): void {
    this.markTouched('password');
    this.passwordValue.set(value);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  selectSpecialization(id: string): void {
    this.form.controls.specialization_id.setValue(id);
    this.markTouched('specialization_id');
  }

  addCertificate(): void {
    this.certificateUrls.push(
      new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(URL_PATTERN)],
      }),
    );
  }

  removeCertificate(index: number): void {
    this.certificateUrls.removeAt(index);
  }

  addDocument(): void {
    this.documents.push(
      this.fb.nonNullable.group({
        file_name: ['', Validators.required],
        file_url: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
        file_type: ['CV', Validators.required],
      }),
    );
  }

  removeDocument(index: number): void {
    this.documents.removeAt(index);
  }

  private isStepValid(step: number): boolean {
    const fields = step === 1 ? this.step1Fields : step === 2 ? this.step2Fields : this.step3Fields;
    return fields.every((f) => {
      const control = this.form.get(f);
      return !control || control.valid;
    });
  }

  goNext(): void {
    const step = this.currentStep();
    const fields = step === 1 ? this.step1Fields : this.step2Fields;
    fields.forEach((f) => {
      this.form.get(f)?.markAsTouched();
      this.markTouched(f);
    });

    if (!this.isStepValid(step)) return;
    this.currentStep.update((s) => Math.min(s + 1, this.totalSteps));
  }

  goBack(): void {
    this.currentStep.update((s) => Math.max(s - 1, 1));
  }

  submit(): void {
    this.step3Fields.forEach((f) => this.markTouched(f));

    if (this.form.invalid || !this.isStepValid(3)) {
      this.form.markAllAsTouched();
      Object.keys(this.form.controls).forEach((key) => this.markTouched(key));
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();

    const payload = {
      full_name: raw.full_name,
      username: raw.username || undefined,
      email: raw.email,
      phone: raw.phone,
      password: raw.password,
      role: 'TRAINER' as const,
      specialization_id: raw.specialization_id,
      bio_ar: raw.bio_ar || undefined,
      bio_en: raw.bio_en || undefined,
      description_ar: raw.description_ar || undefined,
      description_en: raw.description_en || undefined,
      cover_letter: raw.cover_letter || undefined,
      linkedin_url: raw.linkedin_url || undefined,
      facebook_url: raw.facebook_url || undefined,
      website_url: raw.website_url || undefined,
      portfolio_url: raw.portfolio_url || undefined,
      consultation_price_from: raw.consultation_price_from ?? undefined,
      consultation_price_to: raw.consultation_price_to ?? undefined,
      consultation_duration: raw.consultation_duration ?? undefined,
      certificate_urls: this.certificateUrls.getRawValue().filter((v) => !!v),
      documents: this.documents.getRawValue(),
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.authService.setPendingEmail(raw.email);
        this.isLoading.set(false);
        this.router.navigate(['/verify-otp']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const key = apiErrorKey(err, 'auth.errors.generic');
        this.errorMessage.set(key);
        // Duplicate email/username/phone only surfaces at final submit —
        // jump back to the step that owns the field and flag it inline.
        const fieldByError: Record<string, string> = {
          'errors.AUTH_EMAIL_EXISTS': 'email',
          'errors.AUTH_USERNAME_EXISTS': 'username',
          'errors.AUTH_PHONE_EXISTS': 'phone',
          'errors.AUTH_SPECIALIZATION_NOT_FOUND': 'specialization_id',
        };
        const field = fieldByError[key];
        if (field) {
          this.serverFieldError.set({ field, key });
          this.currentStep.set(this.step1Fields.includes(field) ? 1 : this.step2Fields.includes(field) ? 2 : 3);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          this.serverFieldError.set(null);
        }
      },
    });
  }
}
