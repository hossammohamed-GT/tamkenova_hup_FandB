import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { TrainerService } from '../../../../core/services/trainer.service';
import { ApplicationStatusData } from '../../../../core/models/trainer-profile.model';

@Component({
  selector: 'app-trainer-status',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './trainer-status.component.html',
  styleUrls: ['../../portal-shared.css', './trainer-status.component.css'],
})
export class TrainerStatusComponent {
  private trainerService = inject(TrainerService);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  status = signal<ApplicationStatusData | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.trainerService.getApplicationStatus().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.status.set(res.data);

        if (res.data.status === 'APPROVED') {
          setTimeout(() => this.router.navigate(['/portal/trainer']), 1200);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('auth.errors.generic');
      },
    });
  }

  refresh(): void {
    this.load();
  }

  logout(): void {
    this.trainerService.resetCache();
    this.authService.logout();
  }
}
