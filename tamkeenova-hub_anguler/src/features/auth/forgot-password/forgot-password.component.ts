import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AuthVisualPanelComponent } from '../../../shared/components/auth-visual-panel/auth-visual-panel.component';
import { apiErrorKey } from '../../../core/utils/api-error';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, AuthVisualPanelComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../auth-shared.css'],
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  private touchedFields = signal<Set<string>>(new Set());

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.markTouched('email');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const email = this.form.getRawValue().email;
    this.authService.forgotPassword({ email }).subscribe({
      next: () => {
        this.authService.setPendingEmail(email);
        this.isLoading.set(false);
        this.router.navigate(['/reset-password']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }
}
