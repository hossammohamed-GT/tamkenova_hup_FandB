import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, finalize, from, map, mergeMap, of, shareReplay, switchMap, tap } from 'rxjs';
import { Course, CourseCategory } from '../../../core/models/course-catalog.model';
import { CourseCatalogService } from '../../../core/services/course-catalog.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-programs-mega-menu',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './programs-mega-menu.component.html',
  styleUrl: './programs-mega-menu.component.css',
})
export class ProgramsMegaMenuComponent {
  readonly closed = output<void>();
  private readonly catalog = inject(CourseCatalogService);
  private readonly destroyRef = inject(DestroyRef);
  readonly theme = inject(ThemeService);
  readonly categories = signal<CourseCategory[]>([]);
  readonly selected = signal<CourseCategory | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly loadingCategories = signal(true);
  readonly loadingCourses = signal(false);
  readonly categoriesError = signal(false);
  readonly coursesError = signal(false);
  readonly sort = signal('popular');
  readonly english = computed(() => this.theme.language() === 'en');
  readonly sorts = [{ value: 'popular', key: 'popular' }, { value: 'newest', key: 'new' }, { value: 'rating', key: 'rated' }];
  private readonly requests = new Subject<{ category: string; sort: string } | null>();
  // Mounted with the navbar, not recreated by hover. Never cache failed requests.
  private readonly inFlight = new Map<string, Observable<Course[]>>();
  private readonly cache = new Map<string, Course[]>();
  readonly categoryImage = computed(() => {
    const category = this.selected();
    const supported = ['business-professional-skills', 'technology-innovation', 'arts-design-media', 'wellbeing', 'lifestyle', 'education-academics', 'family-relationships', 'languages', 'soft-skills'];
    const slug = supported.includes(category?.slug || '') ? category!.slug : 'business-professional-skills';
    return category?.image_url?.trim() || `/assets/course-categories/${slug}.jpg`;
  });

  constructor() {
    this.requests.pipe(
      tap(() => { this.loadingCourses.set(true); this.coursesError.set(false); this.courses.set([]); }),
      switchMap(query => {
        if (!query) return of({ courses: [] as Course[], failed: false });
        return this.fetchCourses(query.category, query.sort).pipe(
          map(courses => ({ courses, failed: false })),
          catchError(() => of({ courses: [] as Course[], failed: true })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      this.courses.set(result.courses);
      this.coursesError.set(result.failed);
      this.loadingCourses.set(false);
    });
    this.loadCategories();
  }

  loadCategories(): void {
    this.loadingCategories.set(true);
    this.categoriesError.set(false);
    this.catalog.getCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: categories => {
        const previousSlug = this.selected()?.slug;
        this.requests.next(null);
        this.categories.set(categories);
        this.selected.set(null);
        this.cache.clear();
        this.courses.set([]);
        this.loadingCategories.set(false);
        if (categories.length) {
          this.selectCategory(categories.find(category => category.slug === previousSlug) ?? categories[0]);
          // Warm popular courses for every remaining category, with bounded concurrency.
          from(categories.filter(category => category.slug !== this.selected()?.slug)).pipe(
            mergeMap(category => this.fetchCourses(category.slug, 'popular').pipe(catchError(() => EMPTY)), 3),
            takeUntilDestroyed(this.destroyRef),
          ).subscribe();
        }
      },
      error: () => { this.loadingCategories.set(false); this.categoriesError.set(true); },
    });
  }
  private fetchCourses(category: string, sort: string): Observable<Course[]> {
    const key = `${category}:${sort}`;
    if (this.cache.has(key)) return of(this.cache.get(key)!);
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const request = this.catalog.getCourses({ category, sort, limit: 4, page: 1 }).pipe(
      map(response => response.data ?? []),
      tap(courses => this.cache.set(key, courses)),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.inFlight.delete(key)),
      // Continue warming even when the visitor switches categories mid-request.
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.inFlight.set(key, request);
    return request;
  }
  selectCategory(category: CourseCategory): void {
    if (this.selected()?.slug === category.slug) return;
    this.selected.set(category);
    this.loadCourses();
  }
  selectSort(sort: string): void {
    if (this.sort() === sort) return;
    this.sort.set(sort);
    this.loadCourses();
  }
  loadCourses(): void {
    if (this.selected()) this.requests.next({ category: this.selected()!.slug, sort: this.sort() });
  }
  categoryName(category: CourseCategory): string { return this.english() ? category.name_en : category.name_ar; }
  courseTitle(course: Course): string { return this.english() ? course.title_en : course.title_ar; }
  instructor(course: Course): string { return course.instructors?.[0]?.trainers.users?.full_name || ''; }
  rating(course: Course): number { return Number(course.average_rating) || 0; }
  duration(course: Course): string {
    return new Intl.NumberFormat(this.english() ? 'en' : 'ar', { maximumFractionDigits: 1 }).format(course.duration_minutes / 60);
  }
  icon(slug: string): string {
    const paths: Record<string, string> = {
      'business-professional-skills': 'M8 7V4h8v3M3 8h18v12H3zM3 12l9 3 9-3M10 14h4v3h-4z',
      'technology-innovation': 'M5 4h14v12H5zM2 20h20M8 20l1-4h6l1 4',
      'arts-design-media': 'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-2 2-2h2a4 4 0 0 0 4-4c0-5-5-8-10-8zM7 9h.01M11 6h.01M16 7h.01M6 14h.01',
      wellbeing: 'M12 21C4 20 2 15 2 10c5 0 8 3 10 8M12 21c8-1 10-6 10-11-5 0-8 3-10 8M12 18C7 13 8 7 12 2c4 5 5 11 0 16z',
      lifestyle: 'M3 9v6M6 6v12M9 9v6M9 12h6M15 9v6M18 6v12M21 9v6',
      'education-academics': 'M2 8l10-5 10 5-10 5zM6 10v7c4 3 8 3 12 0v-7M22 8v9',
      'family-relationships': 'M20 5c-4-4-8 0-8 0S8 1 4 5c-5 5 8 15 8 15S25 10 20 5z',
      languages: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c-6 6-6 14 0 20 6-6 6-14 0-20z',
      'soft-skills': 'M4 20v-3a8 8 0 0 1 16 0v3M8 6a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
    };
    return paths[slug] || 'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16';
  }
}
