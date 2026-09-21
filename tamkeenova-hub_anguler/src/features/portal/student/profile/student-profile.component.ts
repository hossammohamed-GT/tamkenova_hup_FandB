import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { StudentService } from '../../../../core/services/student.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ContactInfo, StudentProfile } from '../../../../core/models/student.model';
import { apiErrorKey } from '../../../../core/utils/api-error';

type TabId = 'general' | 'contact' | 'security';

const URL_PATTERN = /^https?:\/\/.+/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './student-profile.component.html',
  styleUrls: ['../../portal-shared.css', './student-profile.component.css'],
})
export class StudentProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private studentService = inject(StudentService);
  private authService = inject(AuthService);

  readonly tabs: Array<{ id: TabId; icon: string; labelKey: string }> = [
    { id: 'general', icon: 'fa-user', labelKey: 'student_profile.tabs.general' },
    { id: 'contact', icon: 'fa-address-book', labelKey: 'student_profile.tabs.contact' },
    { id: 'security', icon: 'fa-shield-halved', labelKey: 'student_profile.tabs.security' },
  ];

  activeTab = signal<TabId>('general');
  isLoading = signal(true);
  hasLoaded = signal(false);
  isSaving = signal(false);
  saveSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  profile = signal<StudentProfile | null>(null);

  displayProfile = computed(() => this.profile());

  isUploadingImage = signal(false);
  uploadImageError = signal<string | null>(null);
  profileImage = signal<string | null>(null);

  passwordDone = signal(false);
  passwordError = signal<string | null>(null);
  isChangingPassword = signal(false);

  generalForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    username: ['', [Validators.pattern(USERNAME_PATTERN)]],
    bio: [''],
    location: [''],
  });

  contactForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    whatsapp: [''],
    website_url: ['', [Validators.pattern(URL_PATTERN)]],
    linkedin_url: ['', [Validators.pattern(URL_PATTERN)]],
  });

  passwordForm = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.studentService.getProfile().subscribe({
      next: (res: any) => {
        const profile: StudentProfile = res?.data ?? res;
        if (!profile) {
          this.isLoading.set(false);
          this.hasLoaded.set(true);
          this.errorMessage.set('auth.errors.generic');
          return;
        }
        this.profile.set(profile);
        this.profileImage.set((profile as any).profile_image ?? null);
        this.generalForm.patchValue({
          full_name: (profile as any).full_name ?? '',
          username: (profile as any).username ?? '',
          bio: (profile as any).bio ?? '',
          location: (profile as any).location ?? '',
        });
        this.generalForm.markAsPristine();
        this.loadContact();
      },
      error: (err) => {
        console.error('Student profile load error', err);
        this.isLoading.set(false);
        this.hasLoaded.set(true);
        this.errorMessage.set('auth.errors.generic');
      },
    });
  }

  private loadContact(): void {
    this.studentService.getContactInfo().subscribe({
      next: (info: any) => {
        const data: ContactInfo = info?.data ?? info;
        this.contactForm.patchValue({
          email: (data as any).email ?? '',
          phone: (data as any).phone ?? '',
          whatsapp: (data as any).whatsapp ?? '',
          website_url: (data as any).website_url ?? '',
          linkedin_url: (data as any).linkedin_url ?? '',
        });
        this.contactForm.markAsPristine();
        this.isLoading.set(false);
        this.hasLoaded.set(true);
      },
      error: () => {
        this.isLoading.set(false);
        this.hasLoaded.set(true);
      },
    });
  }

  setTab(id: TabId): void {
    this.activeTab.set(id);
    this.errorMessage.set(null);
  }

  triggerFileInput(): void {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('student-avatar-input') as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.uploadImageError.set('student_profile.errors.invalid_image_type');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.uploadImageError.set('student_profile.errors.image_too_large');
      return;
    }
    this.isUploadingImage.set(true);
    this.uploadImageError.set(null);
    this.studentService.uploadAvatar(file).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.isUploadingImage.set(false);
        this.profileImage.set(data?.profile_image ?? data?.profileImage ?? null);
        this.authService.refreshCurrentUser();
      },
      error: (err) => {
        this.isUploadingImage.set(false);
        this.uploadImageError.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }

  saveGeneral(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.errorMessage.set(null);
    const raw = this.generalForm.getRawValue();
    this.studentService
      .updateProfile({
        full_name: raw.full_name,
        username: raw.username || undefined,
        bio: raw.bio || undefined,
        location: raw.location || undefined,
      })
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          this.isSaving.set(false);
          this.saveSuccess.set(true);
          this.profile.update((p) => (p ? { ...p, ...data } : p));
          this.generalForm.markAsPristine();
          this.authService.refreshCurrentUser();
          setTimeout(() => this.saveSuccess.set(false), 3000);
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message ?? '';
          if (String(msg).toLowerCase().includes('username')) {
            this.errorMessage.set('student_profile.errors.username_taken');
          } else {
            this.errorMessage.set(apiErrorKey(err, 'auth.errors.generic'));
          }
        },
      });
  }

  saveContact(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.errorMessage.set(null);
    const raw = this.contactForm.getRawValue();
    this.studentService
      .updateContactInfo({
        email: raw.email || undefined,
        phone: raw.phone || undefined,
        whatsapp: raw.whatsapp || undefined,
        website_url: raw.website_url || undefined,
        linkedin_url: raw.linkedin_url || undefined,
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saveSuccess.set(true);
          this.contactForm.markAsPristine();
          this.authService.refreshCurrentUser();
          setTimeout(() => this.saveSuccess.set(false), 3000);
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = String(err?.error?.message ?? '');
          if (msg.toLowerCase().includes('email')) {
            this.errorMessage.set('student_profile.errors.email_taken');
          } else if (msg.toLowerCase().includes('phone')) {
            this.errorMessage.set('student_profile.errors.phone_taken');
          } else {
            this.errorMessage.set(apiErrorKey(err, 'auth.errors.generic'));
          }
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const raw = this.passwordForm.getRawValue();
    if (raw.new_password !== raw.confirm_password) {
      this.passwordError.set('student_profile.errors.password_mismatch');
      return;
    }
    if (raw.new_password === raw.current_password) {
      this.passwordError.set('student_profile.errors.password_same');
      return;
    }
    this.isChangingPassword.set(true);
    this.passwordError.set(null);
    this.passwordDone.set(false);
    this.studentService
      .changePassword({
        current_password: raw.current_password,
        new_password: raw.new_password,
      })
      .subscribe({
        next: () => {
          this.isChangingPassword.set(false);
          this.passwordDone.set(true);
          this.passwordForm.reset();
          setTimeout(() => this.passwordDone.set(false), 4000);
        },
        error: (err) => {
          this.isChangingPassword.set(false);
          this.passwordError.set(apiErrorKey(err, 'auth.errors.generic'));
        },
      });
  }
}
