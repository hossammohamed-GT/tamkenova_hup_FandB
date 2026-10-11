import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Course } from '../../../core/models/course-catalog.model';
import { CourseCatalogService } from '../../../core/services/course-catalog.service';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './course-details.component.html',
  styleUrl: './course-details.component.css',
})
export class CourseDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(CourseCatalogService);
  private readonly translate = inject(TranslateService);

  readonly course = signal<Course | null>(null);
  readonly isLoading = signal(true);
  readonly notFound = signal(false);
  readonly isEnglish = computed(() => this.translate.currentLang() === 'en');

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }

    this.catalogService.getCourseBySlug(slug).subscribe({
      next: (course) => {
        this.course.set(course);
        this.isLoading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
  }

  title(course: Course): string {
    return this.isEnglish() ? course.title_en : course.title_ar;
  }

  description(course: Course): string {
    return this.isEnglish()
      ? course.description_en || course.short_description_en || ''
      : course.description_ar || course.short_description_ar || '';
  }

  categoryName(course: Course): string {
    const link =
      course.category_links?.find((item) => item.is_primary) ?? course.category_links?.[0];
    if (!link) return '';
    return this.isEnglish() ? link.course_categories.name_en : link.course_categories.name_ar;
  }

  instructorName(course: Course): string {
    return (
      course.instructors?.[0]?.trainers.users?.full_name ??
      this.translate.instant('programs.catalog.expert_team')
    );
  }

  instructorBio(course: Course): string {
    const trainer = course.instructors?.[0]?.trainers;
    return this.isEnglish() ? trainer?.bio_en || '' : trainer?.bio_ar || '';
  }

  instructorImage(course: Course): string | null {
    return course.instructors?.[0]?.trainers.users?.profile_image ?? null;
  }

  instructorSlug(course: Course): string | null {
    return course.instructors?.[0]?.trainers.slug ?? null;
  }

  levelLabel(level?: string | null): string {
    if (!level) return this.translate.instant('programs.catalog.all_levels');
    const key = `programs.catalog.level_${level.toLowerCase()}`;
    return this.translate.instant(key);
  }

  languageLabel(language: string): string {
    return this.translate.instant(
      language.toLowerCase().startsWith('ar')
        ? 'programs.catalog.language_arabic'
        : 'programs.catalog.language_english',
    );
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
}
