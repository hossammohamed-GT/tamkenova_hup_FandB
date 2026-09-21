import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { apiErrorKey } from '../../../core/utils/api-error';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css',
})
export class VerifyOtpComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  isResending = signal(false);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  email = this.authService.getPendingEmail() ?? '';

  form = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.minLength(4)]],
  });

  submit(): void {
    if (this.form.invalid || !this.email) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService
      .verifyEmail({ email: this.email, otp: this.form.getRawValue().otp })
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

  resendOtp(): void {
    if (!this.email) return;
    this.isResending.set(true);
    this.infoMessage.set(null);

    this.authService.resendOtp({ email: this.email }).subscribe({
      next: () => {
        this.isResending.set(false);
        this.infoMessage.set('auth.otp.resent');
      },
      error: (err) => {
        this.isResending.set(false);
        this.errorMessage.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }
}
