import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { VerificationService } from '../../../core/services/verification.service';
import { VerifyUserResponse } from '../../../core/models/student.model';

@Component({
  selector: 'app-user-public-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './user-public-profile.component.html',
  styleUrl: './user-public-profile.component.css',
})
export class UserPublicProfileComponent {
  private route = inject(ActivatedRoute);
  private verificationService = inject(VerificationService);

  isLoading = signal(true);
  notFound = signal(false);
  data = signal<VerifyUserResponse | null>(null);

  constructor() {
    const username = this.route.snapshot.paramMap.get('username');
    if (!username) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }

    this.verificationService.verifyUser(username).subscribe({
      next: (res) => {
        if (!res.verified) {
          this.notFound.set(true);
        } else {
          this.data.set(res);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
