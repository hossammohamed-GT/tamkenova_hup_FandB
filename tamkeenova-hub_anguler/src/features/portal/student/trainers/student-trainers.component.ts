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
import { TrainerRatingComponent } from '../../../../shared/components/trainer-rating/trainer-rating.component';
import { TrainerPortraitDirective } from '../../../../shared/directives/trainer-portrait.directive';
import { TrainerListItem } from '../../../../core/models/student.model';
import { Specialization } from '../../../../core/models/specialization.model';

@Component({
  selector: 'app-student-trainers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe,
    TrainerRatingComponent,
    TrainerPortraitDirective,
  ],
  templateUrl: './student-trainers.component.html',
  styleUrls: ['../../portal-shared.css', './student-trainers.component.css'],
})
export class StudentTrainersComponent {
  private studentService = inject(StudentService);
  private specializationService = inject(SpecializationService);
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);
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

  specName(t: TrainerListItem): string {
    if (!t.specializations) return '';
    return this.isArabic ? t.specializations.name_ar : t.specializations.name_en;
  }

  bioOf(t: TrainerListItem): string {
    return (this.isArabic ? t.bio_ar : t.bio_en) || t.bio_ar || t.bio_en || '';
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
