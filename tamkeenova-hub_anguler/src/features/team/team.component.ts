import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TrainersService } from '../../core/services/trainers.service';
import { Trainer } from '../../core/models/trainer.model';
import { TrainerCardComponent } from '../../shared/components/trainer-card/trainer-card.component';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, TrainerCardComponent],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css',
})
export class TeamComponent implements OnInit {
  private readonly service = inject(TrainersService);
  private readonly booking = inject(BookingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  readonly trainers = signal<Trainer[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly search = signal('');
  readonly category = signal('');
  readonly experience = signal('');
  readonly availability = signal('');
  readonly sort = signal('popular');
  readonly layout = signal<'grid' | 'list'>('grid');
  readonly english = computed(() => this.translate.currentLang() === 'en');
  readonly categories = computed(() =>
    Array.from(
      new Map(
        this.trainers()
          .filter((t) => t.specializations?.id)
          .map((t) => [t.specializations.id, t.specializations]),
      ).values(),
    ),
  );
  readonly portraits = computed(() =>
    this.trainers()
      .filter((t) => t.users?.profile_image)
      .slice(0, 4),
  );
  readonly studentCount = computed(() =>
    this.trainers().reduce((sum, t) => sum + (t.total_students || 0), 0),
  );
  readonly overallRating = computed(() => {
    const count = this.trainers().reduce((s, t) => s + (t.ratings_count || 0), 0);
    return count
      ? this.trainers().reduce(
          (s, t) => s + Number(t.average_rating || 0) * (t.ratings_count || 0),
          0,
        ) / count
      : 0;
  });
  readonly filtered = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    return this.trainers()
      .filter(
        (t) =>
          (!term ||
            [
              t.users?.full_name,
              t.bio_ar,
              t.bio_en,
              t.specializations?.name_ar,
              t.specializations?.name_en,
            ]
              .join(' ')
              .toLocaleLowerCase()
              .includes(term)) &&
          (!this.category() || t.specializations?.id === this.category()) &&
          (!this.experience() ||
            (this.experience() === '5plus'
              ? t.years_of_experience >= 5
              : t.years_of_experience < 5)) &&
          (!this.availability() || t.is_available),
      )
      .sort((a, b) =>
        this.sort() === 'rating'
          ? Number(b.average_rating || 0) - Number(a.average_rating || 0)
          : this.sort() === 'name'
            ? (a.users?.full_name || '').localeCompare(b.users?.full_name || '')
            : (b.total_students || 0) - (a.total_students || 0),
      );
  });
  ngOnInit() {
    this.loadTrainers();
  }
  loadTrainers() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.service
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.trainers.set(
            (Array.isArray(rows) ? rows : []).filter((t) => t.trainer_status === 'APPROVED'),
          );
          this.isLoading.set(false);
        },
        error: () => {
          this.trainers.set([]);
          this.errorMessage.set('team_ui.load_error');
          this.isLoading.set(false);
        },
      });
  }
  onBook(trainer: Trainer) {
    this.booking.open(trainer);
  }
  reset() {
    this.search.set('');
    this.category.set('');
    this.experience.set('');
    this.availability.set('');
  }
}
