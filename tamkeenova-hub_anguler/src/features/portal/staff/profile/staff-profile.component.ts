import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { StaffService } from '../../../../core/services/staff.service';
import { User } from '../../../../core/models/auth.model';
import { apiErrorKey } from '../../../../core/utils/api-error';

type StaffUser = User & { whatsapp?: string | null };

@Component({
  selector: 'app-staff-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './staff-profile.component.html',
  styleUrls: [
    '../../portal-shared.css',
    '../../staff-shared.css',
    './staff-profile.component.css',
  ],
})
export class StaffProfileComponent {
  private authService = inject(AuthService);
  private staffService = inject(StaffService);
  private fb = inject(FormBuilder);

  isLoading = signal(true);
  profile = signal<StaffUser | null>(null);

  isEmployee = computed(() => this.authService.role() === 'EMPLOYEE');
  basePath = computed(() => (this.isEmployee() ? '/portal/employee' : '/portal/trainee'));
  navDashboardKey = computed(() =>
    this.isEmployee() ? 'employee_dashboard.nav_dashboard' : 'volunteer_dashboard.nav_dashboard',
  );
  roleBadgeKey = computed(() =>
    this.isEmployee() ? 'nav.role_employee' : 'nav.role_volunteer',
  );

  profileImage = signal<string | null>(null);
  isUploadingImage = signal(false);
  uploadImageError = signal<string | null>(null);

  contactForm = this.fb.group({
    phone: [''],
    whatsapp: [''],
  });
  isSavingContact = signal(false);
  contactDone = signal(false);
  contactError = signal<string | null>(null);

  passwordForm = this.fb.group({
    current_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', Validators.required],
  });
  isChangingPassword = signal(false);
  passwordDone = signal(false);
  passwordError = signal<string | null>(null);

  constructor() {
    const cached = this.authService.currentUser() as StaffUser | null;
    if (cached) {
      this.profile.set(cached);
      this.profileImage.set(cached.profile_image ?? null);
      this.contactForm.patchValue({
        phone: cached.phone ?? '',
        whatsapp: cached.whatsapp ?? '',
      });
    }
    this.authService.fetchCurrentUser().subscribe({
      next: (res) => {
        const u = res.data as StaffUser;
        this.profile.set(u);
        this.profileImage.set(u.profile_image ?? null);
        this.contactForm.patchValue({ phone: u.phone ?? '', whatsapp: u.whatsapp ?? '' });
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  triggerFileInput(): void {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('staff-avatar-input') as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.uploadImageError.set('staff_profile.errors.invalid_image_type');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.uploadImageError.set('staff_profile.errors.image_too_large');
      return;
    }
    this.isUploadingImage.set(true);
    this.uploadImageError.set(null);
    this.staffService.uploadAvatar(file).subscribe({
      next: (data: any) => {
        this.isUploadingImage.set(false);
        this.profileImage.set(data?.profile_image ?? null);
        this.authService.refreshCurrentUser();
      },
      error: (err) => {
        this.isUploadingImage.set(false);
        this.uploadImageError.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }

  saveContact(): void {
    const raw = this.contactForm.getRawValue();
    this.isSavingContact.set(true);
    this.contactError.set(null);
    this.contactDone.set(false);
    this.staffService
      .updateContactInfo({
        phone: raw.phone?.trim() || undefined,
        whatsapp: raw.whatsapp?.trim() || undefined,
      })
      .subscribe({
        next: (data: any) => {
          this.isSavingContact.set(false);
          this.contactDone.set(true);
          this.profile.update((p) =>
            p ? { ...p, phone: data?.phone ?? p.phone, whatsapp: data?.whatsapp ?? p.whatsapp } : p,
          );
          this.authService.refreshCurrentUser();
          setTimeout(() => this.contactDone.set(false), 3500);
        },
        error: (err) => {
          this.isSavingContact.set(false);
          const msg = String(err?.error?.message ?? '').toLowerCase();
          this.contactError.set(
            msg.includes('phone')
              ? 'staff_profile.errors.phone_taken'
              : apiErrorKey(err, 'auth.errors.generic'),
          );
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      if (
        this.passwordForm.controls.new_password.invalid &&
        this.passwordForm.controls.new_password.value
      ) {
        this.passwordError.set('staff_profile.errors.password_weak');
      }
      return;
    }
    const raw = this.passwordForm.getRawValue();
    if (raw.new_password !== raw.confirm_password) {
      this.passwordError.set('staff_profile.errors.password_mismatch');
      return;
    }
    if (raw.new_password === raw.current_password) {
      this.passwordError.set('staff_profile.errors.password_same');
      return;
    }
    this.isChangingPassword.set(true);
    this.passwordError.set(null);
    this.passwordDone.set(false);
    this.staffService
      .changePassword({
        current_password: raw.current_password!,
        new_password: raw.new_password!,
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
