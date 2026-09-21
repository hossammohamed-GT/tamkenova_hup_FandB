import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { switchMap } from 'rxjs';
import { TrainerService } from '../../../../core/services/trainer.service';
import { TrainerProfile, TrainerReview } from '../../../../core/models/trainer-profile.model';

@Component({
  selector: 'app-trainer-reviews',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './trainer-reviews.component.html',
  styleUrls: ['../../portal-shared.css', './trainer-reviews.component.css'],
})
export class TrainerReviewsComponent {
  private trainerService = inject(TrainerService);

  readonly starRange = [1, 2, 3, 4, 5];

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  profile = signal<TrainerProfile | null>(null);
  reviews = signal<TrainerReview[]>([]);

  average = computed(() => {
    const list = this.reviews();
    if (!list.length) return 0;
    return list.reduce((s, r) => s + r.rating, 0) / list.length;
  });

  distribution = computed(() => {
    const list = this.reviews();
    const total = list.length;
    return [5, 4, 3, 2, 1].map((star) => {
      const count = list.filter((r) => r.rating === star).length;
      return { star, count, pct: total ? Math.round((count / total) * 100) : 0 };
    });
  });

  sorted = computed(() =>
    [...this.reviews()].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );

  constructor() {
    this.trainerService
      .getMyProfile()
      .pipe(
        switchMap((profile) => {
          this.profile.set(profile);
          return this.trainerService.getTrainerReviews(profile.id);
        }),
      )
      .subscribe({
        next: (list) => {
          this.reviews.set(list);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('auth.errors.generic');
        },
      });
  }
}
