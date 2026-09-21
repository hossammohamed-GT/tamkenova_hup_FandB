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
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, AuthVisualPanelComponent],
  templateUrl: './register.component.html',
  styleUrls: ['../auth-shared.css', './register.component.css'],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  passwordValue = signal('');
  private touchedFields = signal<Set<string>>(new Set());

  readonly passwordRequirements = PASSWORD_REQUIREMENTS;

  form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    username: ['', [Validators.pattern(/^[a-zA-Z0-9_]{3,20}$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^01[0125]\d{8}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
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

  markTouched(field: string): void {
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Object.keys(this.form.controls).forEach((key) => this.markTouched(key));
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = this.form.getRawValue();
    const cleanPayload = {
      ...payload,
      username: payload.username || undefined,
      role: 'STUDENT' as const,
    };

    this.authService.register(cleanPayload).subscribe({
      next: () => {
        this.authService.setPendingEmail(payload.email);
        this.isLoading.set(false);
        this.router.navigate(['/verify-otp']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }
}
