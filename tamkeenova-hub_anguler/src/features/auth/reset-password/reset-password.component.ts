import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AuthVisualPanelComponent } from '../../../shared/components/auth-visual-panel/auth-visual-panel.component';
import { apiErrorKey } from '../../../core/utils/api-error';
import { PASSWORD_REQUIREMENTS } from '../../../core/utils/password-strength';

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, AuthVisualPanelComponent],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../auth-shared.css'],
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  passwordValue = signal('');
  readonly passwordRequirements = PASSWORD_REQUIREMENTS;

  form = this.fb.nonNullable.group({
    email: [this.authService.getPendingEmail() ?? '', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    new_password: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD)]],
    confirm_password: ['', [Validators.required]],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  isRequirementMet(test: (v: string) => boolean): boolean {
    return test(this.passwordValue());
  }

  onPasswordInput(value: string): void {
    this.passwordValue.set(value);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.new_password.invalid) {
        this.errorMessage.set('errors.AUTH_PASSWORD_POLICY');
      }
      return;
    }
    const value = this.form.getRawValue();
    if (value.new_password !== value.confirm_password) {
      this.errorMessage.set('auth.errors.password_mismatch');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.authService.setPendingEmail(value.email);
    this.authService
      .resetPassword({
        email: value.email,
        otp: value.otp,
        new_password: value.new_password,
        confirm_password: value.confirm_password,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(apiErrorKey(err, 'auth.errors.generic'));
        },
      });
  }
}
