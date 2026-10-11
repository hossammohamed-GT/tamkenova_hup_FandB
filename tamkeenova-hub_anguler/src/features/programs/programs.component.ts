import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';
import {
  Course,
  CourseCategory,
  CourseCollection,
  LearningProgram,
} from '../../core/models/course-catalog.model';
import { CourseCatalogService } from '../../core/services/course-catalog.service';

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

@Component({
  selector: 'app-programs',
  standalone: true,
  imports: [CommonModule, TranslatePipe, FormsModule, RouterLink],
  templateUrl: './programs.component.html',
  styleUrl: './programs.component.css',
})
export class ProgramsComponent {
  private readonly catalogService = inject(CourseCatalogService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);

  readonly isEnglish = computed(() => this.translate.currentLang() === 'en');
  readonly categories = signal<CourseCategory[]>([]);
  readonly collections = signal<CourseCollection[]>([]);
  readonly learningPrograms = signal<LearningProgram[]>([]);
  readonly courses = signal<Course[]>([]);
  readonly selectedCategory = signal('');
  readonly selectedLevel = signal('');
  readonly selectedType = signal('');
  readonly selectedLanguage = signal('');
  readonly selectedSort = signal('newest');
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly hasMore = signal(false);
  readonly catalogUnavailable = signal(false);
  readonly totalCourses = signal(0);
  readonly page = signal(1);
  readonly pageSize = 12;
  searchInput = '';

  readonly visibleCollections = computed(() =>
    this.collections().filter((collection) => collection.courses?.length > 0),
  );
  readonly featuredPrograms = computed(() =>
    this.learningPrograms().filter((program) => program.courses?.length > 0),
  );
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
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const sort = params.get('sort') ?? 'newest';
      const contentType = params.get('content_type') ?? '';
      const allowedSorts = ['newest', 'popular', 'rating', 'duration'];

      this.selectedSort.set(allowedSorts.includes(sort) ? sort : 'newest');
      this.selectedType.set(contentType === 'VIDEO' || contentType === 'PODCOURSE' ? contentType : '');
      this.searchInput = '';
      this.selectedCategory.set('');
      this.selectedLevel.set('');
      this.selectedLanguage.set('');
      this.loadCourses(true);
    });
  }

  retry(): void {
    this.catalogUnavailable.set(false);
    this.loadLandingContent();
    this.loadCourses(true);
  }

  private loadLandingContent(): void {
    forkJoin({
      categories: this.catalogService.getCategories().pipe(
        catchError(() => {
          this.catalogUnavailable.set(true);
          return of([] as CourseCategory[]);
        }),
      ),
      collections: this.catalogService.getCollections().pipe(
        catchError(() => {
          this.catalogUnavailable.set(true);
          return of([] as CourseCollection[]);
        }),
      ),
      programs: this.catalogService.getLearningPrograms().pipe(
        catchError(() => {
          this.catalogUnavailable.set(true);
          return of([] as LearningProgram[]);
        }),
      ),
    }).subscribe(({ categories, collections, programs }) => {
      this.categories.set(categories);
      this.collections.set(collections);
      this.learningPrograms.set(programs);
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
        limit: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.courses.update((current) =>
            reset ? (response.data ?? []) : [...current, ...(response.data ?? [])],
          );
          this.page.set(response.meta?.page ?? nextPage);
          this.totalCourses.set(response.meta?.total ?? response.count ?? 0);
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
    this.selectedCategory.set(this.selectedCategory() === slug ? '' : slug);
    this.loadCourses(true);
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
    this.searchInput = '';
    this.selectedCategory.set('');
    this.selectedLevel.set('');
    this.selectedType.set('');
    this.selectedLanguage.set('');
    this.selectedSort.set('newest');
    this.loadCourses(true);
  }

  categoryName(category: CourseCategory): string {
    return this.isEnglish() ? category.name_en : category.name_ar;
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
