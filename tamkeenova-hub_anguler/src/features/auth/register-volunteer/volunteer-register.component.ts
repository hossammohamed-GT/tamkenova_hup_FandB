import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AuthVisualPanelComponent } from '../../../shared/components/auth-visual-panel/auth-visual-panel.component';
import { PASSWORD_REQUIREMENTS, passwordScore } from '../../../core/utils/password-strength';
import { apiErrorKey } from '../../../core/utils/api-error';

@Component({
  selector: 'app-volunteer-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, AuthVisualPanelComponent],
  templateUrl: './volunteer-register.component.html',
  styleUrls: ['../auth-shared.css', './volunteer-register.component.css'],
})
export class VolunteerRegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  passwordValue = signal('');
  successMessage = signal<string | null>(null);

  private touchedFields = signal<Set<string>>(new Set());

  readonly passwordRequirements = PASSWORD_REQUIREMENTS;

  form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    username: ['', [Validators.pattern(/^[a-zA-Z0-9_]{3,20}$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^01[0125]\d{8}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    bio: [''],
  });

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

  markTouched(name: string): void {
    this.touchedFields.update((set) => new Set(set).add(name));
  }

  isFieldValid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.valid && this.touchedFields().has(name);
  }

  isFieldInvalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && this.touchedFields().has(name);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Object.keys(this.form.controls).forEach((key) => this.markTouched(key));
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    this.authService
      .registerVolunteer({
        full_name: raw.full_name,
        username: raw.username || undefined,
        email: raw.email,
        phone: raw.phone,
        password: raw.password,
        bio: raw.bio || undefined,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('auth.volunteer_register.success_note');
          this.authService.setPendingEmail(raw.email);
          setTimeout(() => this.router.navigate(['/verify-otp']), 1600);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(apiErrorKey(err, 'auth.volunteer_register.error_generic'));
        },
      });
  }
}
