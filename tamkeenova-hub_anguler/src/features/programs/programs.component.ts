import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Course,
  CourseCategory,
  CourseCollection,
  LearningProgram,
} from '../../core/models/course-catalog.model';
import { CourseCatalogService } from '../../core/services/course-catalog.service';
import { TrainersService } from '../../core/services/trainers.service';

// Category records still come from the API; this only supplies local artwork if
// the database row has not been seeded with image_url yet.
const CATEGORY_CARD_IMAGE_FALLBACKS: Readonly<Record<string, string>> = {
  'business-professional-skills': '/assets/course-categories/business-professional-skills.jpg',
  'technology-innovation': '/assets/course-categories/technology-innovation.jpg',
  'arts-design-media': '/assets/course-categories/arts-design-media.jpg',
  wellbeing: '/assets/course-categories/wellbeing.jpg',
  lifestyle: '/assets/course-categories/lifestyle.jpg',
  'education-academics': '/assets/course-categories/education-academics.jpg',
  'family-relationships': '/assets/course-categories/family-relationships.jpg',
  languages: '/assets/course-categories/languages.jpg',
  'soft-skills': '/assets/course-categories/soft-skills.jpg',
};

const CATEGORY_RECTANGLE_CLIP_PATH =
  'polygon(0 0, 6% 0, 12% 0, 88% 0, 94% 0, 100% 0, 100% 88%, 100% 94%, 100% 100%, 12% 100%, 6% 100%, 0 100%)';

@Component({
  selector: 'app-programs',
  standalone: true,
  imports: [CommonModule, TranslatePipe, FormsModule, RouterLink],
  templateUrl: './programs.component.html',
  styleUrl: './programs.component.css',
})
export class ProgramsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalogService = inject(CourseCatalogService);
  private readonly trainersService = inject(TrainersService);
  private readonly translate = inject(TranslateService);
  private categoryScrollTimer: number | null = null;

  @ViewChild('categoryGrid') private categoryGrid?: ElementRef<HTMLDivElement>;

  readonly isEnglish = computed(() => this.translate.currentLang() === 'en');
  readonly isLoadingCategories = signal(true);
  readonly categoriesUnavailable = signal(false);
  readonly categoryPlaceholders = Array.from({ length: 9 }, (_, index) => index);
  readonly categories = signal<CourseCategory[]>([]);
  readonly categoryCount = signal<number | null>(null);
  readonly expertCount = signal<number | null>(null);
  readonly collections = signal<CourseCollection[]>([]);
  readonly learningPrograms = signal<LearningProgram[]>([]);
  readonly courses = signal<Course[]>([]);
  readonly selectedCategory = signal('');
  readonly isCategoryImageAnimating = signal(false);
  readonly selectedLevel = signal('');
  readonly selectedType = signal('');
  readonly selectedLanguage = signal('');
  readonly selectedSort = signal('newest');
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly hasMore = signal(false);
  readonly catalogUnavailable = signal(false);
  readonly totalCourses = signal(0);
  readonly catalogCourseCount = signal<number | null>(null);
  readonly page = signal(1);
  readonly pageSize = 12;
  searchInput = '';

  readonly visibleCollections = computed(() =>
    this.collections().filter((collection) => collection.courses?.length > 0),
  );
  readonly selectedCategoryRecord = computed(
    () => this.categories().find((category) => category.slug === this.selectedCategory()) ?? null,
  );
  readonly visibleLearningPrograms = computed(() => {
    const selectedSlug = this.selectedCategory();
    const category = this.selectedCategoryRecord();
    const selectedSlugs = new Set(
      [category?.slug, ...(category?.children ?? []).map((child) => child.slug)].filter(
        (slug): slug is string => !!slug,
      ),
    );

    return this.learningPrograms().filter(
      (program) =>
        program.courses?.length > 0 &&
        (!selectedSlug || selectedSlugs.has(program.course_categories?.slug ?? '')),
    );
  });
  get activeFilterCount(): number {
    return (
      Number(!!this.selectedCategory()) +
      Number(!!this.selectedLevel()) +
      Number(!!this.selectedType()) +
      Number(!!this.selectedLanguage()) +
      Number(!!this.searchInput.trim())
    );
  }

  readonly levels = [
    { value: '', label: 'programs.catalog.all_levels' },
    { value: 'BEGINNER', label: 'programs.catalog.level_beginner' },
    { value: 'INTERMEDIATE', label: 'programs.catalog.level_intermediate' },
    { value: 'ADVANCED', label: 'programs.catalog.level_advanced' },
    { value: 'ALL_LEVELS', label: 'programs.catalog.level_all' },
  ];

  constructor() {
    this.loadLandingContent();
    this.loadCourses(true);
  }

  retry(): void {
    this.catalogUnavailable.set(false);
    this.loadLandingContent();
    this.loadCourses(true);
  }

  private loadLandingContent(): void {
    // Start categories first and publish each response independently. A slow
    // trainer/collection request must never hold the category section back.
    this.loadCategories();
    this.catalogService.getCollections().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (collections) => this.collections.set(collections),
      error: () => this.collections.set([]),
    });
    this.catalogService.getLearningPrograms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (programs) => this.learningPrograms.set(programs),
      error: () => this.learningPrograms.set([]),
    });
    this.trainersService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (trainers) => this.expertCount.set(
        trainers.filter((trainer) => trainer.trainer_status === 'APPROVED').length,
      ),
      error: () => this.expertCount.set(null),
    });
  }

  loadCategories(): void {
    this.isLoadingCategories.set(true);
    this.categoriesUnavailable.set(false);
    this.catalogService.getCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.categoryCount.set(categories.length);
        this.isLoadingCategories.set(false);
      },
      error: () => {
        this.categoriesUnavailable.set(true);
        this.isLoadingCategories.set(false);
      },
    });
  }

  loadCourses(reset = true): void {
    if (reset) {
      this.isLoading.set(true);
      this.page.set(1);
    } else {
      this.isLoadingMore.set(true);
    }

    const nextPage = reset ? 1 : this.page() + 1;
    this.catalogService
      .getCourses({
        search: this.searchInput.trim() || undefined,
        category: this.selectedCategory() || undefined,
        level: this.selectedLevel() || undefined,
        content_type: this.selectedType() || undefined,
        language: this.selectedLanguage() || undefined,
        sort: this.selectedSort(),
        page: nextPage,
        limit: this.selectedCategory() ? 60 : this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.courses.update((current) =>
            reset ? (response.data ?? []) : [...current, ...(response.data ?? [])],
          );
          this.page.set(response.meta?.page ?? nextPage);
          const resultCount = response.meta?.total ?? response.count ?? 0;
          this.totalCourses.set(resultCount);
          if (
            !this.searchInput.trim() &&
            !this.selectedCategory() &&
            !this.selectedLevel() &&
            !this.selectedType() &&
            !this.selectedLanguage()
          ) {
            this.catalogCourseCount.set(resultCount);
          }
          this.hasMore.set((response.meta?.page ?? nextPage) < (response.meta?.total_pages ?? 0));
          this.catalogUnavailable.set(false);
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
        error: () => {
          if (reset) this.courses.set([]);
          this.catalogUnavailable.set(true);
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
          this.hasMore.set(false);
        },
      });
  }

  selectCategory(slug: string): void {
    if (!slug) {
      if (this.selectedCategory()) this.showAllCategories();
      return;
    }
    if (this.selectedCategory() === slug) {
      this.showAllCategories();
      return;
    }

    this.cancelCategoryPageScroll();
    const sourceCard = Array.from(
      this.categoryGrid?.nativeElement.querySelectorAll<HTMLElement>('.category-tile') ?? [],
    ).find((card) => card.dataset['category'] === slug);
    const sourceImage = sourceCard?.querySelector<HTMLImageElement>('.category-image');
    const sourceBounds = sourceCard?.getBoundingClientRect();
    const flightImage =
      sourceCard && sourceImage && sourceBounds && sourceBounds.width > 0
        ? this.createCategoryImageFlight(
            sourceImage,
            sourceBounds,
            getComputedStyle(sourceCard).clipPath,
          )
        : null;

    // Render the selected page immediately. The copied image first squares its
    // corners in place, then flies into the hero as the page scrolls to the top.
    this.isCategoryImageAnimating.set(!!flightImage);
    this.activateCategory(slug);

    if (flightImage && sourceBounds) {
      window.requestAnimationFrame(() =>
        this.animateCategoryImageFlight(flightImage, sourceBounds),
      );
    } else {
      this.scrollToPageTopImmediately();
    }
  }

  showAllCategories(): void {
    this.cancelCategoryPageScroll();
    document.querySelector('.category-image-flight')?.remove();
    this.isCategoryImageAnimating.set(false);
    this.resetCatalogFilters();
    this.scrollToPageTopImmediately();
  }

  private createCategoryImageFlight(
    sourceImage: HTMLImageElement,
    bounds: DOMRect,
    clipPath: string,
  ): HTMLImageElement {
    document.querySelector('.category-image-flight')?.remove();

    const flightImage = document.createElement('img');
    flightImage.className = 'category-image-flight';
    flightImage.src = sourceImage.currentSrc || sourceImage.src;
    flightImage.alt = '';
    flightImage.setAttribute('aria-hidden', 'true');
    flightImage.style.left = `${bounds.left}px`;
    flightImage.style.top = `${bounds.top}px`;
    flightImage.style.width = `${bounds.width}px`;
    flightImage.style.height = `${bounds.height}px`;
    flightImage.style.clipPath = clipPath;
    flightImage.style.objectPosition = getComputedStyle(sourceImage).objectPosition;
    document.body.appendChild(flightImage);
    return flightImage;
  }

  private animateCategoryImageFlight(
    flightImage: HTMLImageElement,
    sourceBounds: DOMRect,
    retry = 0,
  ): void {
    const target = document.querySelector<HTMLElement>('.programs-page .category-detail-art');
    if (!target || !target.clientWidth || !target.clientHeight) {
      if (retry < 2) {
        window.requestAnimationFrame(() =>
          this.animateCategoryImageFlight(flightImage, sourceBounds, retry + 1),
        );
      } else {
        flightImage.remove();
        this.isCategoryImageAnimating.set(false);
        this.scrollToPageTopImmediately();
      }
      return;
    }

    const targetBounds = target.getBoundingClientRect();
    const destination = {
      left: `${targetBounds.left + window.scrollX}px`,
      top: `${targetBounds.top + window.scrollY}px`,
      width: `${targetBounds.width}px`,
      height: `${targetBounds.height}px`,
    };
    const start = {
      left: `${sourceBounds.left}px`,
      top: `${sourceBounds.top}px`,
      width: `${sourceBounds.width}px`,
      height: `${sourceBounds.height}px`,
    };
    const originalClipPath = flightImage.style.clipPath || 'none';
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const duration = reducedMotion ? 1 : 860;
    const morphOffset = 0.2;
    const morphDuration = Math.round(duration * morphOffset);
    const travelDuration = Math.max(1, duration - morphDuration);

    if (typeof flightImage.animate === 'function') {
      const animation = flightImage.animate(
        [
          { ...start, clipPath: originalClipPath, opacity: 1, offset: 0 },
          { ...start, clipPath: CATEGORY_RECTANGLE_CLIP_PATH, opacity: 1, offset: morphOffset },
          { ...destination, clipPath: CATEGORY_RECTANGLE_CLIP_PATH, opacity: 1, offset: 0.9 },
          { ...destination, clipPath: CATEGORY_RECTANGLE_CLIP_PATH, opacity: 0, offset: 1 },
        ],
        {
          duration,
          easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)',
          fill: 'forwards',
        },
      );
      this.scheduleCategoryPageScroll(morphDuration);
      void animation.finished.then(
        () => this.finishCategoryImageFlight(flightImage),
        () => this.finishCategoryImageFlight(flightImage),
      );
      return;
    }

    flightImage.style.transition = `clip-path ${morphDuration}ms ease-in-out`;
    window.requestAnimationFrame(() => {
      flightImage.style.clipPath = CATEGORY_RECTANGLE_CLIP_PATH;
      this.scheduleCategoryPageScroll(morphDuration);
      window.setTimeout(() => {
        if (!this.selectedCategory()) return;
        flightImage.style.transition = `left ${travelDuration}ms cubic-bezier(0.2, 0.75, 0.25, 1), top ${travelDuration}ms cubic-bezier(0.2, 0.75, 0.25, 1), width ${travelDuration}ms cubic-bezier(0.2, 0.75, 0.25, 1), height ${travelDuration}ms cubic-bezier(0.2, 0.75, 0.25, 1), opacity ${travelDuration}ms ease`;
        flightImage.style.left = destination.left;
        flightImage.style.top = destination.top;
        flightImage.style.width = destination.width;
        flightImage.style.height = destination.height;
        flightImage.style.opacity = '0';
      }, morphDuration);
    });
    window.setTimeout(() => this.finishCategoryImageFlight(flightImage), duration + 50);
  }

  private scheduleCategoryPageScroll(delay: number): void {
    this.cancelCategoryPageScroll();
    if (window.scrollY <= 0) return;

    this.categoryScrollTimer = window.setTimeout(() => {
      this.categoryScrollTimer = null;
      if (this.selectedCategory()) this.scrollToPageTopImmediately();
    }, delay);
  }

  private cancelCategoryPageScroll(): void {
    if (this.categoryScrollTimer === null) return;
    window.clearTimeout(this.categoryScrollTimer);
    this.categoryScrollTimer = null;
  }

  private finishCategoryImageFlight(flightImage: HTMLImageElement): void {
    flightImage.remove();
    this.cancelCategoryPageScroll();
    if (this.selectedCategory()) this.scrollToPageTopImmediately();
    this.isCategoryImageAnimating.set(false);
  }

  private activateCategory(slug: string): void {
    this.searchInput = '';
    this.selectedCategory.set(slug);
    this.selectedLevel.set('');
    this.selectedType.set('');
    this.selectedLanguage.set('');
    this.selectedSort.set('newest');
    this.loadCourses(true);
  }

  private resetCatalogFilters(): void {
    this.searchInput = '';
    this.selectedCategory.set('');
    this.selectedLevel.set('');
    this.selectedType.set('');
    this.selectedLanguage.set('');
    this.selectedSort.set('newest');
    this.loadCourses(true);
  }

  private scrollToPageTopImmediately(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const rootStyle = document.documentElement.style;
    const previousScrollBehavior = rootStyle.scrollBehavior;
    rootStyle.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    rootStyle.scrollBehavior = previousScrollBehavior;
  }

  selectLevel(event: Event): void {
    this.selectedLevel.set((event.target as HTMLSelectElement).value);
    this.loadCourses(true);
  }

  selectType(event: Event): void {
    this.selectedType.set((event.target as HTMLSelectElement).value);
    this.loadCourses(true);
  }

  selectLanguage(event: Event): void {
    this.selectedLanguage.set((event.target as HTMLSelectElement).value);
    this.loadCourses(true);
  }

  selectSort(event: Event): void {
    this.selectedSort.set((event.target as HTMLSelectElement).value);
    this.loadCourses(true);
  }

  submitSearch(): void {
    this.loadCourses(true);
  }

  clearFilters(): void {
    if (this.selectedCategory()) {
      this.showAllCategories();
      return;
    }
    this.resetCatalogFilters();
  }

  categoryName(category: CourseCategory): string {
    return this.isEnglish() ? category.name_en : category.name_ar;
  }

  categoryDescription(category: CourseCategory): string {
    const description = this.isEnglish() ? category.description_en : category.description_ar;
    return (
      description?.trim() ||
      this.translate.instant('programs.catalog.category_description_fallback')
    );
  }

  categoryCardImage(category: CourseCategory): string | null {
    return category.image_url?.trim() || CATEGORY_CARD_IMAGE_FALLBACKS[category.slug] || null;
  }

  courseTitle(course: Course): string {
    return this.isEnglish() ? course.title_en : course.title_ar;
  }

  courseSummary(course: Course): string {
    return this.isEnglish()
      ? course.short_description_en || course.description_en || ''
      : course.short_description_ar || course.description_ar || '';
  }

  collectionTitle(collection: CourseCollection): string {
    return this.isEnglish() ? collection.title_en : collection.title_ar;
  }

  learningProgramTitle(program: LearningProgram): string {
    return this.isEnglish() ? program.title_en : program.title_ar;
  }

  learningProgramDescription(program: LearningProgram): string {
    return this.isEnglish()
      ? program.short_description_en || program.description_en || ''
      : program.short_description_ar || program.description_ar || '';
  }

  courseCategoryName(course: Course): string {
    const primary = course.category_links?.find((link) => link.is_primary)?.course_categories;
    const category = primary ?? course.category_links?.[0]?.course_categories;
    return category ? this.categoryName(category) : '';
  }

  selectedCategoryName(): string {
    const category = this.categories().find((item) => item.slug === this.selectedCategory());
    return category ? this.categoryName(category) : '';
  }

  courseInstructorName(course: Course): string {
    return (
      course.instructors?.[0]?.trainers.users?.full_name ??
      this.translate.instant('programs.catalog.expert_team')
    );
  }

  courseInstructorImage(course: Course): string | null {
    return course.instructors?.[0]?.trainers.users?.profile_image ?? null;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return this.translate.instant('programs.catalog.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes
      ? this.translate.instant('programs.catalog.hours_minutes', {
          hours,
          minutes: remainingMinutes,
        })
      : this.translate.instant('programs.catalog.hours', { count: hours });
  }

  hasRatings(course: Course): boolean {
    return course.ratings_count > 0 && Number(course.average_rating) > 0;
  }

  formatRating(value: number | string): string {
    const rating = Number(value);
    return Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
  }

  categoryIcon(slug: string): string {
    const icons: Record<string, string> = {
      'business-professional-skills': 'fa-chart-line',
      'technology-innovation': 'fa-microchip',
      'arts-design-media': 'fa-palette',
      wellbeing: 'fa-heart-pulse',
      lifestyle: 'fa-compass',
      'education-academics': 'fa-graduation-cap',
      'family-relationships': 'fa-people-group',
      languages: 'fa-language',
      'soft-skills': 'fa-comments',
    };
    return icons[slug] ?? 'fa-book-open';
  }
}
