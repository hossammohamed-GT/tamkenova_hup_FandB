import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TrainerRatingComponent } from '../../../shared/components/trainer-rating/trainer-rating.component';
import {
  trainerVisual,
  safePublicLink,
} from '../../../shared/components/trainer-card/trainer-visual';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TrainersService } from '../../../core/services/trainers.service';
import { Trainer } from '../../../core/models/trainer.model';
import { TrainerPortraitDirective } from '../../../shared/directives/trainer-portrait.directive';
import { BookingService } from '../../../core/services/booking.service';
import { SeoService } from '../../../core/seo/seo.service';
import { Crumb } from '../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-trainer-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    TrainerRatingComponent,
    TrainerPortraitDirective,
  ],
  templateUrl: './trainer-details.component.html',
  styleUrl: './trainer-details.component.css',
})
export class TrainerDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private trainersService = inject(TrainersService);
  private bookingService = inject(BookingService);
  private seo = inject(SeoService);
  private translate = inject(TranslateService);

  crumbs = computed<Crumb[]>(() => [
    { labelKey: 'nav.home', route: '/' },
    { labelKey: 'nav.team', route: '/team' },
    { label: this.name() },
  ]);

  constructor() {
    effect(() => this.pushSeo());
  }

  trainer = signal<Trainer | null>(null);
  loading = signal(true);
  notFound = signal(false);
  showBooking = signal(false);

  readonly english = computed(() => this.translate.currentLang() === 'en');
  readonly loadFailed = signal(false);
  readonly expanded = signal(false);
  readonly visual = computed(() =>
    trainerVisual(
      this.trainer()?.specializations?.name_en || this.trainer()?.specialization_id || '',
    ),
  );
  readonly courses = computed(
    () => this.trainer()?.course_instructors?.map((row) => row.courses) ?? [],
  );
  readonly reviews = computed(() => this.trainer()?.trainer_reviews ?? []);
  readonly histogram = computed(() =>
    [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: this.reviews().filter((review) => review.rating === stars).length,
      percent: this.reviews().length
        ? (this.reviews().filter((review) => review.rating === stars).length /
            this.reviews().length) *
          100
        : 0,
    })),
  );
  readonly membershipDate = computed(() => {
    const value = this.trainer()?.users?.created_at || this.trainer()?.created_at;
    return value && Number.isFinite(Date.parse(value)) ? value : null;
  });
  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.notFound.set(false);
          this.loadFailed.set(false);
          this.trainer.set(null);
          this.expanded.set(false);
        }),
        switchMap((params) => {
          const slug = params.get('slug');
          return slug
            ? this.trainersService.getTrainerBySlug(slug).pipe(
                catchError((error) => {
                  if (error.status === 404 || error.status === 400) this.notFound.set(true);
                  else this.loadFailed.set(true);
                  return of(null);
                }),
              )
            : of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        const data = res?.data;
        if (data?.trainer_status === 'APPROVED') this.trainer.set(data);
        else if (!this.loadFailed()) this.notFound.set(true);
        this.loading.set(false);
      });
  }
  retry(): void {
    window.location.reload();
  }
  publicLink = safePublicLink;

  avatar = computed(() => this.trainer()?.users?.profile_image ?? null);
  name = computed(() => this.trainer()?.users?.full_name ?? '');
  specialization = computed(() =>
    this.english()
      ? this.trainer()?.specializations?.name_en || this.trainer()?.specializations?.name_ar || ''
      : this.trainer()?.specializations?.name_ar || this.trainer()?.specializations?.name_en || '',
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

  bio = computed(() =>
    this.english()
      ? this.trainer()?.bio_en || this.trainer()?.bio_ar || ''
      : this.trainer()?.bio_ar || this.trainer()?.bio_en || '',
  );
  description = computed(() =>
    this.english()
      ? this.trainer()?.description_en || this.trainer()?.description_ar || ''
      : this.trainer()?.description_ar || this.trainer()?.description_en || '',
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
    ]
      .map((s) => ({ ...s, url: safePublicLink(s.url) }))
      .filter((s) => !!s.url);
  });

  openBooking(): void {
    const trainer = this.trainer();
    if (!trainer) return;
    this.bookingService.open(trainer);
  }

  closeBooking(): void {
    this.showBooking.set(false);
  }

  private pushSeo(): void {
    const t = this.trainer();
    this.seo.setPageIndexable(!!t);
    if (!t) return;
    this.translate.currentLang();
    const url = this.seo.absoluteUrl(`/team/${t.slug}`);
    const bio = this.bio() || this.description();
    this.seo.setDynamic({
      title: `${this.name()} | TamkeeNova HUB`,
      description: bio || this.specialization(),
      image: this.avatar(),
      type: 'profile',
    });
    this.seo.setBreadcrumbJsonLd([
      { name: this.translate.instant('nav.home'), url: this.seo.absoluteUrl('/') },
      { name: this.translate.instant('nav.team'), url: this.seo.absoluteUrl('/team') },
      { name: this.name(), url },
    ]);
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: this.name(),
      url,
      ...(this.avatar() ? { image: this.seo.absoluteUrl(this.avatar()!) } : {}),
      ...(bio ? { description: bio } : {}),
      ...(this.specialization() ? { jobTitle: this.specialization() } : {}),
      worksFor: {
        '@type': 'EducationalOrganization',
        name: 'TamkeeNova HUB',
        url: this.seo.absoluteUrl('/'),
      },
      ...(this.socials().length > 0 ? { sameAs: this.socials().map((s) => s.url) } : {}),
    });
  }
}
