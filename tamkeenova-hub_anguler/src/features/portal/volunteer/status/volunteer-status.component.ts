import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { VolunteersService } from '../../../../core/services/volunteers.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-volunteer-status',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './volunteer-status.component.html',
  styleUrls: ['../../trainer/status/trainer-status.component.css'],
})
export class VolunteerStatusComponent {
  private volunteersService = inject(VolunteersService);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  status = signal<{ status: string; rejection_reason?: string | null } | null>(null);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.volunteersService.getMyStatus().subscribe({
      next: (res) => {
        this.status.set(res);
        this.isLoading.set(false);
        if (res?.status === 'APPROVED') {
          this.volunteersService.isApprovedCached = true;
          setTimeout(() => this.router.navigate(['/portal/volunteer']), 900);
        }
      },
      error: (err) => {
        if (err?.status !== 401) {
          // Endpoint unavailable — the admin still reviews the account,
          // keep the volunteer informed instead of an error wall.
          this.status.set({ status: 'PENDING' });
        }
        this.isLoading.set(false);
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
