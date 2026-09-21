import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TrainersService } from '../../../core/services/trainers.service';
import { Trainer } from '../../../core/models/trainer.model';
// ⚠️ لو أسماء الملفات/الـ selectors مختلفة عندك، عدّل المسارين دول
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';
import { BookingModalComponent } from '../../../shared/components/booking-modal/booking-modal.component';
import { BookingService } from '../../../core/services/booking.service';

@Component({
  selector: 'app-trainer-details',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, StarRatingComponent, BookingModalComponent],
  templateUrl: './trainer-details.component.html',
  styleUrl: './trainer-details.component.css',
})
export class TrainerDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private trainersService = inject(TrainersService);
  private bookingService = inject(BookingService);

  trainer = signal<Trainer | null>(null);
  loading = signal(true);
  notFound = signal(false);
  showBooking = signal(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.trainersService.getTrainerBySlug(slug).subscribe({
      next: (res) => {
        const data = res.data;
        if (!data || data.trainer_status !== 'APPROVED') {
          this.notFound.set(true);
        } else {
          this.trainer.set(data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  avatar = computed(() => this.trainer()?.users?.profile_image ?? null);
  name = computed(() => this.trainer()?.users?.full_name ?? '');
  specialization = computed(
    () =>
      this.trainer()?.specializations?.name_ar ?? this.trainer()?.specializations?.name_en ?? '',
  );

  rating = computed(() => {
    const r = this.trainer()?.average_rating;
    return r ? parseFloat(r) : 0;
  });
  ratingsCount = computed(() => this.trainer()?.ratings_count ?? 0);
  experienceYears = computed(() => this.trainer()?.years_of_experience ?? 0);
  studentsCount = computed(() => this.trainer()?.total_students ?? 0);
  programsCount = computed(() => this.trainer()?._count?.training_programs ?? 0);
  reviewsCount = computed(() => this.trainer()?._count?.trainer_reviews ?? 0);

  certificates = computed(() => this.trainer()?.trainer_certificates ?? []);
  programs = computed(() => this.trainer()?.training_programs ?? []);

  bio = computed(() => this.trainer()?.bio_ar || this.trainer()?.bio_en || '');
  description = computed(
    () => this.trainer()?.description_ar || this.trainer()?.description_en || '',
  );

  priceFrom = computed(() => this.trainer()?.consultation_price_from);
  priceTo = computed(() => this.trainer()?.consultation_price_to);
  hasPriceRange = computed(() => !!this.priceFrom() && !!this.priceTo());
  duration = computed(() => this.trainer()?.consultation_duration);

  socials = computed(() => {
    const t = this.trainer();
    if (!t) return [];
    return [
      { key: 'linkedin', url: t.linkedin_url, icon: 'fa-brands fa-linkedin' },
      { key: 'website', url: t.website_url, icon: 'fa-solid fa-globe' },
      { key: 'facebook', url: t.facebook_url, icon: 'fa-brands fa-facebook' },
      { key: 'portfolio', url: t.portfolio_url, icon: 'fa-solid fa-briefcase' },
    ].filter((s) => !!s.url);
  });

  initials = computed(() => {
    const n = this.name();
    if (!n) return '';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  });

  openBooking(): void {
    const trainer = this.trainer();
    if (!trainer) return;
    this.bookingService.open(trainer);
  }

  closeBooking(): void {
    this.showBooking.set(false);
  }
}
