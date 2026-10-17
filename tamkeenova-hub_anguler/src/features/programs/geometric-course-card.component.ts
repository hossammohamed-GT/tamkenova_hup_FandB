import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Course, CourseCategory } from '../../core/models/course-catalog.model';
import { CourseBookmarksService } from '../../core/services/course-bookmarks.service';

const THEMES: Record<string, { color: string; light: string; icon: string; variant: number }> = {
  'business-professional-skills': {
    color: '#006775',
    light: '#57d8d0',
    icon: 'M4 19V11h4v8m4 0V7h4v12m4 0V3M3 7l6-4 5 2 7-4',
    variant: 0,
  },
  'technology-innovation': {
    color: '#5b3bd1',
    light: '#b29aff',
    icon: 'M3 4h18v13H3z M8 21h8 M12 17v4 M8 9l-2 2 2 2m8-4 2 2-2 2',
    variant: 1,
  },
  'arts-design-media': {
    color: '#b85b27',
    light: '#ffc579',
    icon: 'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-2 2-2h2a4 4 0 0 0 4-4c0-5-5-8-10-8z M7 9h.01 M11 6h.01 M16 7h.01 M6 14h.01',
    variant: 2,
  },
  wellbeing: {
    color: '#29764f',
    light: '#8ce1b4',
    icon: 'M12 21C4 20 2 15 2 10c5 0 8 3 10 8 M12 21c8-1 10-6 10-11-5 0-8 3-10 8 M12 18C7 13 8 7 12 2c4 5 5 11 0 16z',
    variant: 3,
  },
  'education-academics': {
    color: '#7447af',
    light: '#d5b5ff',
    icon: 'M2 8l10-5 10 5-10 5z M6 10v7c4 3 8 3 12 0v-7 M22 8v9',
    variant: 1,
  },
  lifestyle: {
    color: '#a66b19',
    light: '#ffd487',
    icon: 'M3 9v6 M6 6v12 M9 9v6 M9 12h6 M15 9v6 M18 6v12 M21 9v6',
    variant: 2,
  },
  'family-relationships': {
    color: '#b34a59',
    light: '#ffb5bf',
    icon: 'M8 7a3 3 0 1 0 0 .01 M17 7a3 3 0 1 0 0 .01 M2 21v-3a6 6 0 0 1 12 0v3 M14 13a6 6 0 0 1 8 5v3',
    variant: 3,
  },
  languages: {
    color: '#227985',
    light: '#91e2e8',
    icon: 'M3 5h12 M9 2v3 M5 5c0 5 4 8 8 10 M13 5c0 5-4 8-10 10 M13 22l5-13 5 13 M15 18h6',
    variant: 0,
  },
  'soft-skills': {
    color: '#6940b5',
    light: '#d1aeff',
    icon: 'M3 3h15v12H8l-5 4z M18 8h4v14l-5-4h-6v-3',
    variant: 1,
  },
};
const SILHOUETTES = [
  'M40 5H321Q332 5 340 13L385 48Q396 57 396 74V351Q396 367 381 375L331 403Q322 408 310 408H48Q36 408 27 398L10 378Q4 371 4 358V49Q4 36 15 26Z',
  'M35 5H304Q318 5 328 15L386 61Q396 69 396 84V354Q396 369 382 378L340 404Q332 409 316 409H46Q33 409 24 399L9 382Q4 376 4 364V48Q4 34 15 23Z',
  'M45 5H311Q330 5 343 18L382 54Q396 66 396 86V349Q396 371 376 382L341 400Q327 409 308 409H52Q32 409 19 394L10 384Q4 376 4 362V55Q4 39 17 27Z',
  'M44 5H305C326 5 338 16 352 29L382 57Q396 70 396 89V344Q396 368 377 380L342 400Q328 409 308 409H54Q34 409 21 396L11 385Q4 377 4 360V57Q4 39 18 26Z',
];
let instance = 0;

@Component({
  selector: 'app-geometric-course-card',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './geometric-course-card.component.html',
  styleUrl: './geometric-course-card.component.css',
})
export class GeometricCourseCardComponent {
  readonly course = input.required<Course>();
  readonly categories = input<CourseCategory[]>([]);
  readonly compact = input(false);
  readonly bookmarks = inject(CourseBookmarksService);
  private readonly translate = inject(TranslateService);
  readonly english = computed(() => this.translate.currentLang() === 'en');
  readonly uid = `geometric-course-${++instance}`;
  readonly photoFailed = signal(false);
  readonly avatarFailed = signal(false);
  readonly announcement = signal('');
  readonly category = computed(() => {
    const links = this.course().category_links ?? [];
    return (links.find((link) => link.is_primary) ?? links[0])?.course_categories;
  });
  readonly theme = computed(() => {
    const category = this.category();
    const parent = this.categories().find(
      (c) => c.id === category?.parent_id || c.children?.some((child) => child.id === category?.id),
    );
    return THEMES[parent?.slug ?? category?.slug ?? ''] ?? THEMES['business-professional-skills'];
  });
  readonly outline = computed(() => SILHOUETTES[this.theme().variant]);
  readonly title = computed(() =>
    this.english() ? this.course().title_en : this.course().title_ar,
  );
  readonly summary = computed(() =>
    this.english()
      ? this.course().short_description_en || this.course().description_en || ''
      : this.course().short_description_ar || this.course().description_ar || '',
  );
  readonly instructor = computed(() => {
    const instructors = this.course().instructors ?? [];
    return (instructors.find((i) => i.is_primary) ?? instructors[0])?.trainers;
  });
  readonly instructorName = computed(
    () =>
      this.instructor()?.users?.full_name || this.translate.instant('programs.catalog.expert_team'),
  );
  readonly specialization = computed(() =>
    this.english()
      ? this.instructor()?.specializations?.name_en
      : this.instructor()?.specializations?.name_ar,
  );
  readonly levelKey = computed(() => {
    const keys: Record<string, string> = {
      BEGINNER: 'level_beginner',
      INTERMEDIATE: 'level_intermediate',
      ADVANCED: 'level_advanced',
      ALL_LEVELS: 'level_all',
    };
    return this.course().level
      ? 'programs.catalog.' + (keys[this.course().level!] ?? 'level_all')
      : '';
  });
  readonly rating = computed(() => {
    const value = Number(this.course().average_rating);
    return this.course().ratings_count > 0 && Number.isFinite(value) && value > 0
      ? value.toFixed(1)
      : null;
  });
  readonly isNew = computed(() => {
    const date = Date.parse(this.course().published_at ?? '');
    const age = Date.now() - date;
    return Number.isFinite(date) && age >= 0 && age < 30 * 86400000;
  });
  constructor() {
    effect(() => {
      this.course();
      this.photoFailed.set(false);
      this.avatarFailed.set(false);
    });
  }
  ref(name: string): string {
    return `url(#${this.uid}-${name})`;
  }
  duration(): string {
    const minutes = this.course().duration_minutes;
    if (minutes < 60) return this.translate.instant('programs.catalog.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60),
      remaining = minutes % 60;
    return this.translate.instant(
      remaining ? 'programs.catalog.hours_minutes' : 'programs.catalog.hours',
      { hours, minutes: remaining, count: hours },
    );
  }
  toggleBookmark(): void {
    const result = this.bookmarks.toggle(this.course().id);
    this.announcement.set(
      this.translate.instant(
        'programs.geometric.' +
          (result.saved ? (result.persisted ? 'saved_device' : 'saved_session') : 'removed'),
      ),
    );
  }
}
