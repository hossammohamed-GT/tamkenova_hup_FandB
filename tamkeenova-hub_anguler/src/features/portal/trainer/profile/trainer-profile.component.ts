import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TrainerService } from '../../../../core/services/trainer.service';
import { SpecializationService } from '../../../../core/services/specialization.service';
import { TrainerProfile } from '../../../../core/models/trainer-profile.model';
import { apiErrorKey } from '../../../../core/utils/api-error';

const URL_PATTERN = /^https?:\/\/.+/;

type TabId = 'general' | 'specialization' | 'links' | 'pricing' | 'certificates' | 'documents';

@Component({
  selector: 'app-trainer-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './trainer-profile.component.html',
  styleUrls: ['../../portal-shared.css', './trainer-profile.component.css'],
})
export class TrainerProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private trainerService = inject(TrainerService);
  private specializationService = inject(SpecializationService);

  readonly tabs: Array<{ id: TabId; icon: string; labelKey: string }> = [
    { id: 'general', icon: 'fa-user', labelKey: 'trainer_profile.tabs.general' },
    { id: 'specialization', icon: 'fa-briefcase', labelKey: 'trainer_profile.tabs.specialization' },
    { id: 'links', icon: 'fa-link', labelKey: 'trainer_profile.tabs.links' },
    { id: 'pricing', icon: 'fa-tag', labelKey: 'trainer_profile.tabs.pricing' },
    { id: 'certificates', icon: 'fa-certificate', labelKey: 'trainer_profile.tabs.certificates' },
    { id: 'documents', icon: 'fa-file-lines', labelKey: 'trainer_profile.tabs.documents' },
  ];

  activeTab = signal<TabId>('general');

  isLoading = signal(true);
  hasLoaded = signal(false);
  isSaving = signal(false);
  saveSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  profile = signal<TrainerProfile | null>(null);

  // fallback لمنع اختفاء الصفحة بالكامل لو الـ API فشل
  displayProfile = computed(() => this.profile());

  isUploadingImage = signal(false);
  uploadImageError = signal<string | null>(null);
  profileImage = signal<string | null>(null);

  showSpecRequest = signal(false);
  specRequestSaving = signal(false);
  specRequestDone = signal(false);

  hasChanges = computed(() => this.form.dirty || this.certificateUrls.dirty || this.documents.dirty);

  specRequestForm = this.fb.nonNullable.group({
    name_ar: ['', Validators.required],
    name_en: ['', Validators.required],
  });

  form = this.fb.nonNullable.group({
    bio_ar: [''],
    bio_en: [''],
    description_ar: [''],
    description_en: [''],
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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);

    this.trainerService.getMyProfile().subscribe({
      next: (res: any) => {
        // يدعم { data: {...} } أو مباشرة {...}
        const profile: TrainerProfile = res?.data ?? res;
        if (!profile || !profile.users) {
          console.warn('Trainer profile unexpected shape', res);
          this.isLoading.set(false);
          this.hasLoaded.set(true);
          this.errorMessage.set('auth.errors.generic');
          return;
        }
        this.profile.set(profile);
        this.profileImage.set(profile.users?.profile_image ?? null);

        this.form.patchValue({
          bio_ar: profile.bio_ar ?? '',
          bio_en: profile.bio_en ?? '',
          description_ar: profile.description_ar ?? '',
          description_en: profile.description_en ?? '',
          linkedin_url: profile.linkedin_url ?? '',
          facebook_url: profile.facebook_url ?? '',
          website_url: profile.website_url ?? '',
          portfolio_url: profile.portfolio_url ?? '',
          consultation_price_from: profile.consultation_price_from
            ? Number(profile.consultation_price_from)
            : null,
          consultation_price_to: profile.consultation_price_to
            ? Number(profile.consultation_price_to)
            : null,
          consultation_duration: profile.consultation_duration,
        });

        this.certificateUrls.clear();
        (profile.trainer_certificates ?? []).forEach((c: any) => {
          this.certificateUrls.push(
            new FormControl(c.certificate_url, {
              nonNullable: true,
              validators: [Validators.required, Validators.pattern(URL_PATTERN)],
            }),
          );
        });

        this.documents.clear();
        (profile.trainer_documents ?? []).forEach((d: any) => {
          this.documents.push(
            this.fb.nonNullable.group({
              file_name: [d.file_name, Validators.required],
              file_url: [d.file_url, [Validators.required, Validators.pattern(URL_PATTERN)]],
              file_type: [d.file_type, Validators.required],
            }),
          );
        });

        this.form.markAsPristine();
        this.certificateUrls.markAsPristine();
        this.documents.markAsPristine();
        this.isLoading.set(false);
        this.hasLoaded.set(true);
      },
      error: (err) => {
        console.error('Trainer profile load error', err);
        this.isLoading.set(false);
        this.hasLoaded.set(true);
        this.errorMessage.set('auth.errors.generic');
      },
    });
  }

  setTab(id: TabId): void {
    // ثبات تام - لا يعيد تحميل ولا يخفي المحتوى
    this.activeTab.set(id);
  }

  triggerFileInput(): void {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('profile-image-input') as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.uploadImageError.set('trainer_profile.errors.invalid_image_type');
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.uploadImageError.set('trainer_profile.errors.image_too_large');
      return;
    }
    this.uploadImage(file);
  }

  uploadImage(file: File): void {
    this.isUploadingImage.set(true);
    this.uploadImageError.set(null);
    this.trainerService.uploadProfileImage(file).subscribe({
      next: (res) => {
        this.isUploadingImage.set(false);
        this.profileImage.set(res.profile_image);
      },
      error: (err) => {
        this.isUploadingImage.set(false);
        this.uploadImageError.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }

  toggleSpecRequest(): void {
    this.showSpecRequest.update((v) => !v);
    this.specRequestDone.set(false);
  }

  submitSpecRequest(): void {
    if (this.specRequestForm.invalid) {
      this.specRequestForm.markAllAsTouched();
      return;
    }
    this.specRequestSaving.set(true);
    this.specializationService.requestNew(this.specRequestForm.getRawValue()).subscribe({
      next: () => {
        this.specRequestSaving.set(false);
        this.specRequestDone.set(true);
        this.specRequestForm.reset();
      },
      error: () => {
        this.specRequestSaving.set(false);
      },
    });
  }

  addCertificate(): void {
    this.certificateUrls.push(
      new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(URL_PATTERN)],
      }),
    );
    this.form.markAsDirty();
  }

  removeCertificate(index: number): void {
    this.certificateUrls.removeAt(index);
    this.form.markAsDirty();
  }

  addDocument(): void {
    this.documents.push(
      this.fb.nonNullable.group({
        file_name: ['', Validators.required],
        file_url: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
        file_type: ['CV', Validators.required],
      }),
    );
    this.form.markAsDirty();
  }

  removeDocument(index: number): void {
    this.documents.removeAt(index);
    this.form.markAsDirty();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.errorMessage.set(null);
    const raw = this.form.getRawValue();
    const payload = {
      bio_ar: raw.bio_ar || undefined,
      bio_en: raw.bio_en || undefined,
      description_ar: raw.description_ar || undefined,
      description_en: raw.description_en || undefined,
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
    this.trainerService.updateMyProfile(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        this.form.markAsPristine();
        this.certificateUrls.markAsPristine();
        this.documents.markAsPristine();
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }
}
