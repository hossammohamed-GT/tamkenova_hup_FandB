import { Component, input, computed, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Trainer } from '../../../core/models/trainer.model';
import { AuthService } from '../../../core/services/auth.service';
import { TrainerService } from '../../../core/services/trainer.service';
import { apiErrorKey } from '../../../core/utils/api-error';

@Component({
  selector: 'app-trainer-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './trainer-card.component.html',
  styleUrl: './trainer-card.component.css',
})
export class TrainerCardComponent {
  private authService = inject(AuthService);
  private trainerService = inject(TrainerService);

  trainer = input.required<Trainer>();
  index = input<number>(0);
  interactiveRating = input<boolean>(true);

  book = output<Trainer>();
  rated = output<{ trainerId: string; rating: number }>();

  readonly bookBtnKey = 'team.book_btn';

  avatar = computed(() => this.trainer().users?.profile_image ?? null);
  name = computed(() => this.trainer().users?.full_name ?? '');
  specialization = computed(
    () => this.trainer().specializations?.name_ar ?? this.trainer().specializations?.name_en ?? '',
  );

  rating = computed(() => {
    const override = this.averageOverride();
    if (override !== null) return override;
    return this.trainer().average_rating ? parseFloat(this.trainer().average_rating) : 0;
  });
  ratingsCount = computed(() => this.countOverride() ?? this.trainer().ratings_count ?? 0);
  experienceYears = computed(() => this.trainer().years_of_experience ?? 0);
  studentsCount = computed(() => this.trainer().total_students ?? 0);
  programsCount = computed(() => this.trainer()._count?.training_programs ?? 0);
  certificatesCount = computed(() => this.trainer().trainer_certificates?.length ?? 0);

  priceFrom = computed(() => this.trainer().consultation_price_from);
  priceTo = computed(() => this.trainer().consultation_price_to);
  hasPriceRange = computed(() => !!this.priceFrom() && !!this.priceTo());
  duration = computed(() => this.trainer().consultation_duration);

  bio = computed(() => this.trainer().bio_ar || this.trainer().bio_en || '');

  initials = computed(() => {
    const n = this.name();
    if (!n) return '';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  });

  // -- Interactive rating state --
  hoverRating = signal(0);
  userRating = signal(0);
  isRating = signal(false);
  ratingSuccess = signal(false);
  ratingSuccessMsg = signal('student_trainers.rating_success');
  ratingError = signal<string | null>(null);
  showRatingHint = signal(false);
  averageOverride = signal<number | null>(null);
  countOverride = signal<number | null>(null);
  private ratingMsgTimer: ReturnType<typeof setTimeout> | null = null;

  isStudent = this.authService.isStudent;
  isLoggedIn = this.authService.isLoggedIn;

  displayRating = computed(() => {
    const hover = this.hoverRating();
    if (hover > 0) return hover;
    const user = this.userRating();
    if (user > 0) return user;
    return this.rating();
  });

  starsArray = [1, 2, 3, 4, 5];

  getStarState(starIndex: number): 'full' | 'half' | 'empty' {
    const r = this.displayRating();
    const diff = r - (starIndex - 1);
    if (diff >= 1) return 'full';
    if (diff >= 0.5) return 'half';
    return 'empty';
  }

  isStarActive(starIndex: number): boolean {
    return starIndex <= this.displayRating();
  }

  isStarHovered(starIndex: number): boolean {
    const hover = this.hoverRating();
    if (hover === 0) return false;
    return starIndex <= hover;
  }

  onStarEnter(star: number): void {
    if (!this.interactiveRating()) return;
    this.hoverRating.set(star);
  }

  onStarLeave(): void {
    this.hoverRating.set(0);
  }

  onStarClick(star: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.interactiveRating() || this.isRating()) return;

    // Never fail silently: guests and non-students get a visible message under the card.
    if (!this.isLoggedIn()) {
      this.flashRatingError('student_trainers.login_to_rate');
      return;
    }
    if (!this.isStudent()) {
      this.flashRatingError('student_trainers.only_students');
      return;
    }

    this.isRating.set(true);
    this.ratingError.set(null);
    this.ratingSuccess.set(false);

    this.trainerService.createReview(this.trainer().id, { rating: star, comment: '' }).subscribe({
      next: (res) => {
        this.userRating.set(star);
        this.ratingSuccessMsg.set(
          res.updated ? 'student_trainers.rating_updated' : 'student_trainers.rating_success',
        );
        if (res.data) {
          this.averageOverride.set(Number(res.data.average_rating) || 0);
          this.countOverride.set(Number(res.data.ratings_count) || 0);
        }
        this.ratingSuccess.set(true);
        this.isRating.set(false);
        this.rated.emit({ trainerId: this.trainer().id, rating: star });
        this.clearRatingMsgLater(() => this.ratingSuccess.set(false), 2500);
      },
      error: (err) => {
        this.isRating.set(false);
        if (err?.status === 409) {
          this.flashRatingError('student_trainers.already_rated');
        } else {
          this.flashRatingError(apiErrorKey(err, 'auth.errors.generic'));
        }
      },
    });
  }

  private flashRatingError(key: string): void {
    this.ratingSuccess.set(false);
    this.ratingError.set(key);
    this.clearRatingMsgLater(() => this.ratingError.set(null), 3500);
  }

  private clearRatingMsgLater(clear: () => void, ms: number): void {
    if (this.ratingMsgTimer) clearTimeout(this.ratingMsgTimer);
    this.ratingMsgTimer = setTimeout(() => {
      this.ratingMsgTimer = null;
      clear();
    }, ms);
  }

  onBookClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.book.emit(this.trainer());
  }
}
