import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AuthVisualPanelComponent } from '../../../shared/components/auth-visual-panel/auth-visual-panel.component';
import { apiErrorKey } from '../../../core/utils/api-error';

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
  email = this.authService.getPendingEmail() ?? '';

  form = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required]],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid || !this.email) {
      this.form.markAllAsTouched();
      if (!this.email) this.errorMessage.set('auth.errors.generic');
      return;
    }
    const value = this.form.getRawValue();
    if (value.new_password !== value.confirm_password) {
      this.errorMessage.set('auth.errors.password_mismatch');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.authService
      .resetPassword({
        email: this.email,
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
