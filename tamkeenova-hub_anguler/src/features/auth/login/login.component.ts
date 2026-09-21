import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AuthVisualPanelComponent } from '../../../shared/components/auth-visual-panel/auth-visual-panel.component';
import { apiErrorKey } from '../../../core/utils/api-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, AuthVisualPanelComponent],
  templateUrl: './login.component.html',
  styleUrls: ['../auth-shared.css', './login.component.css'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  private touchedFields = signal<Set<string>>(new Set());

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
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

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.authService.setSession(res);
        this.isLoading.set(false);

        const role = res.data.user.role;
        if (role === 'TRAINER') {
          this.router.navigate(['/portal/trainer']);
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          this.router.navigate(['/portal/admin']);
        } else if (role === 'EMPLOYEE') {
          this.router.navigate(['/portal/employee']);
        } else if (role === 'VOLUNTEER') {
          this.router.navigate(['/portal/volunteer']);
        } else {
          this.router.navigate(['/portal/student']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(apiErrorKey(err, 'auth.errors.invalid_credentials'));
      },
    });
  }
}
