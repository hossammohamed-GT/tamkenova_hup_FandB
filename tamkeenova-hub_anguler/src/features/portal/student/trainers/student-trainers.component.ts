import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { StudentService } from '../../../../core/services/student.service';
import { SpecializationService } from '../../../../core/services/specialization.service';
import { BookingService } from '../../../../core/services/booking.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TrainerService } from '../../../../core/services/trainer.service';
import { TrainerListItem } from '../../../../core/models/student.model';
import { Specialization } from '../../../../core/models/specialization.model';
import { apiErrorKey } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-student-trainers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './student-trainers.component.html',
  styleUrls: ['../../portal-shared.css', './student-trainers.component.css'],
})
export class StudentTrainersComponent {
  private studentService = inject(StudentService);
  private specializationService = inject(SpecializationService);
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);
  private trainerService = inject(TrainerService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  isLoading = signal(true);
  trainers = signal<TrainerListItem[]>([]);
  specializations = signal<Specialization[]>([]);

  search = signal('');
  specializationId = signal('');
  minRating = signal(0);

  page = signal(1);
  totalPages = signal(1);
  total = signal(0);

  // rating state per trainer
  hoverRatings = signal<Record<string, number>>({});
  userRatings = signal<Record<string, number>>({});
  ratingLoading = signal<Record<string, boolean>>({});
  ratingSuccess = signal<Record<string, boolean>>({});
  ratingErrors = signal<Record<string, string | null>>({});

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.load();
    });

    this.specializationService.getAll().subscribe({
      next: (res) => this.specializations.set(res ?? []),
      error: () => undefined,
    });

    this.load();
  }

  get isArabic(): boolean {
    return this.translate.currentLang() !== 'en';
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.searchSubject.next(value);
  }

  onSpecChange(value: string): void {
    this.specializationId.set(value);
    this.page.set(1);
    this.load();
  }

  onRatingChange(value: number): void {
    this.minRating.set(Number(value));
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.studentService
      .getTrainers({
        search: this.search().trim() || undefined,
        specialization_id: this.specializationId() || undefined,
        min_rating: this.minRating() > 0 ? this.minRating() : undefined,
        page: this.page(),
        limit: 12,
      })
      .subscribe({
        next: (res) => {
          this.trainers.set(res.data ?? []);
          this.total.set(res.meta?.total ?? res.total ?? 0);
          this.totalPages.set(res.meta?.totalPages ?? 1);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ratingOf(t: TrainerListItem): number {
    return t.average_rating ? Number(t.average_rating) : 0;
  }

  displayRating(t: TrainerListItem): number {
    const hover = this.hoverRatings()[t.id] ?? 0;
    if (hover > 0) return hover;
    const user = this.userRatings()[t.id] ?? 0;
    if (user > 0) return user;
    return this.ratingOf(t);
  }

  specName(t: TrainerListItem): string {
    if (!t.specializations) return '';
    return this.isArabic ? t.specializations.name_ar : t.specializations.name_en;
  }

  bioOf(t: TrainerListItem): string {
    return (this.isArabic ? t.bio_ar : t.bio_en) || t.bio_ar || t.bio_en || '';
  }

  onStarEnter(trainerId: string, star: number): void {
    this.hoverRatings.update((m) => ({ ...m, [trainerId]: star }));
  }

  onStarLeave(trainerId: string): void {
    this.hoverRatings.update((m) => {
      const copy = { ...m };
      delete copy[trainerId];
      return copy;
    });
  }

  rateTrainer(trainer: TrainerListItem, star: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.authService.isLoggedIn() || this.ratingLoading()[trainer.id]) return;

    this.ratingLoading.update((m) => ({ ...m, [trainer.id]: true }));
    this.ratingErrors.update((m) => ({ ...m, [trainer.id]: null }));

    this.trainerService.createReview(trainer.id, { rating: star, comment: '' }).subscribe({
      next: () => {
        this.userRatings.update((m) => ({ ...m, [trainer.id]: star }));
        this.ratingSuccess.update((m) => ({ ...m, [trainer.id]: true }));
        this.ratingLoading.update((m) => ({ ...m, [trainer.id]: false }));
        // update local average optimistically
        this.trainers.update((list) =>
          list.map((t) =>
            t.id === trainer.id
              ? {
                  ...t,
                  average_rating: String(
                    (Number(t.average_rating || 0) * t.ratings_count + star) / (t.ratings_count + 1),
                  ),
                  ratings_count: t.ratings_count + 1,
                }
              : t,
          ),
        );
        setTimeout(() => {
          this.ratingSuccess.update((m) => {
            const copy = { ...m };
            delete copy[trainer.id];
            return copy;
          });
        }, 2500);
      },
      error: (err) => {
        this.ratingLoading.update((m) => ({ ...m, [trainer.id]: false }));
        if (err?.status === 409) {
          this.ratingErrors.update((m) => ({ ...m, [trainer.id]: 'student_trainers.already_rated' }));
        } else {
          this.ratingErrors.update((m) => ({ ...m, [trainer.id]: apiErrorKey(err, 'auth.errors.generic') }));
        }
        setTimeout(() => {
          this.ratingErrors.update((m) => {
            const copy = { ...m };
            delete copy[trainer.id];
            return copy;
          });
        }, 3000);
      },
    });
  }

  bookConsultation(trainer: TrainerListItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.bookingService.open({
      id: trainer.id,
      slug: trainer.slug,
      users: {
        full_name: trainer.users.full_name,
        profile_image: trainer.users.profile_image,
      },
      specializations: trainer.specializations
        ? {
            name_ar: trainer.specializations.name_ar,
            name_en: trainer.specializations.name_en,
          }
        : null,
    } as never);
  }
}
