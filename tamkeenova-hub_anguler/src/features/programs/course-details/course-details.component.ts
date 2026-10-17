import { CourseLearningActionsComponent } from '../../course-workflow/course-learning-actions.component';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Subject,
  catchError,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { Course, CourseLesson, CourseSection } from '../../../core/models/course-catalog.model';
import { CourseCatalogService } from '../../../core/services/course-catalog.service';
import { AuthService } from '../../../core/services/auth.service';
import { YoutubePlayerComponent } from '../../../shared/components/youtube-player/youtube-player.component';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, YoutubePlayerComponent, CourseLearningActionsComponent],
  templateUrl: './course-details.component.html',
  styleUrl: './course-details.component.css',
})
export class CourseDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(CourseCatalogService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  private readonly reload = new Subject<void>();
  private readonly selections = new Subject<CourseLesson | null>();
  readonly course = signal<Course | null>(null);
  readonly isLoading = signal(true);
  readonly notFound = signal(false);
  readonly loadError = signal(false);
  readonly isEnglish = computed(() => this.translate.currentLang() === 'en');
  readonly selectedLesson = signal<CourseLesson | null>(null);
  readonly videoUrl = signal<string | null>(null);
  readonly playbackBusy = signal(false);
  readonly playbackError = signal(false);
  readonly accessNotice = signal(false);
  readonly accessLoading = signal(false);
  readonly canWatch = signal(false);
  readonly expanded = signal<Set<string>>(new Set());
  readonly lessons = computed(() =>
    [...(this.course()?.lessons ?? [])].sort((a, b) => a.position - b.position),
  );
  readonly previews = computed(() => this.lessons().filter((lesson) => lesson.is_preview));
  readonly chapters = computed(() => {
    const course = this.course();
    const sections = [...(course?.sections ?? [])].sort((a, b) => a.position - b.position);
    const known = new Set(sections.map((section) => section.id));
    const chapters = sections.map((section) => ({
      ...section,
      lessons: this.lessons().filter((lesson) => lesson.section_id === section.id),
    }));
    const ungrouped = this.lessons().filter(
      (lesson) => !lesson.section_id || !known.has(lesson.section_id),
    );
    if (ungrouped.length)
      chapters.push({
        id: 'ungrouped',
        title_ar: '',
        title_en: '',
        position: sections.length,
        lessons: ungrouped,
      });
    return chapters;
  });
  readonly currentIndex = computed(() =>
    this.lessons().findIndex((lesson) => lesson.id === this.selectedLesson()?.id),
  );
  readonly playingTitle = computed(() => {
    const lesson = this.selectedLesson();
    return lesson
      ? this.lessonTitle(lesson)
      : this.translate.instant('programs.video.introduction');
  });
  readonly isDemo = computed(() => this.course()?.slug.startsWith('demo-catalog-v1-') ?? false);

  constructor() {
    this.selections
      .pipe(
        switchMap((lesson) => {
          this.playbackBusy.set(false);
          this.playbackError.set(false);
          this.accessNotice.set(false);
          const course = this.course();
          if (!course) return EMPTY;
          if (!lesson) return of({ lesson: null, media_url: course.preview_video_url ?? null });
          if (course.is_free || lesson.is_preview)
            return of({ lesson, media_url: lesson.media_url ?? null });
          if (!this.canWatch()) {
            this.accessNotice.set(true);
            return EMPTY;
          }
          this.playbackBusy.set(true);
          return this.catalogService.getLessonPlayback(course.slug, lesson.id).pipe(
            map((result) => ({ lesson, media_url: result.media_url })),
            catchError((error) => {
              this.playbackBusy.set(false);
              if ([401, 403].includes(error.status)) this.accessNotice.set(true);
              else this.playbackError.set(true);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.selectedLesson.set(result.lesson);
        this.videoUrl.set(result.media_url);
        this.playbackBusy.set(false);
      });

    this.route.paramMap
      .pipe(
        map((params) => params.get('slug') || ''),
        distinctUntilChanged(),
        switchMap((slug) =>
          this.reload.pipe(
            startWith(undefined),
            switchMap(() => {
              this.course.set(null);
              this.selections.next(null);
              this.videoUrl.set(null);
              this.selectedLesson.set(null);
              this.isLoading.set(true);
              this.notFound.set(false);
              this.loadError.set(false);
              this.canWatch.set(false);
              this.accessLoading.set(false);
              if (!slug) {
                this.notFound.set(true);
                this.isLoading.set(false);
                return EMPTY;
              }
              return this.catalogService.getCourseBySlug(slug).pipe(
                tap((course) => {
                  this.course.set(course);
                  this.isLoading.set(false);
                  this.canWatch.set(course.is_free);
                  this.expanded.set(new Set([course.sections?.[0]?.id || 'ungrouped']));
                  this.selections.next(null); // Always start with the introduction, not the last lesson.
                }),
                switchMap((course) => {
                  if (course.is_free || !this.auth.isLoggedIn())
                    return of({ can_watch: course.is_free });
                  this.accessLoading.set(true);
                  return this.catalogService
                    .getCourseAccess(slug)
                    .pipe(catchError(() => of({ can_watch: false })));
                }),
                catchError((error) => {
                  this.isLoading.set(false);
                  this.notFound.set(error.status === 404);
                  this.loadError.set(error.status !== 404);
                  return EMPTY;
                }),
              );
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((access) => {
        this.canWatch.set(access.can_watch);
        this.accessLoading.set(false);
      });
  }
  retry(): void {
    this.reload.next();
  }
  selectLesson(lesson: CourseLesson | null): void {
    this.selections.next(lesson);
    if (lesson?.section_id)
      this.expanded.update((current) => new Set([...current, lesson.section_id!]));
    if (!this.accessNotice())
      document
        .getElementById('course-player')
        ?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  navigateLesson(direction: number): void {
    const index = this.currentIndex() + direction;
    if (index < 0) this.selectLesson(null);
    else if (index < this.lessons().length) this.selectLesson(this.lessons()[index]);
  }
  toggleChapter(id: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  expandAll(): void {
    this.expanded.set(new Set(this.chapters().map((chapter) => chapter.id)));
  }
  lessonTitle(lesson: CourseLesson): string {
    return this.isEnglish() ? lesson.title_en : lesson.title_ar;
  }
  chapterTitle(chapter: CourseSection): string {
    return (
      (this.isEnglish() ? chapter.title_en : chapter.title_ar) ||
      this.translate.instant('programs.video.ungrouped')
    );
  }
  chapterDuration(lessons: CourseLesson[]): number {
    return lessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0);
  }
  available(lesson: CourseLesson): boolean {
    return !!this.course()?.is_free || lesson.is_preview || this.canWatch();
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
    if (!level || level === 'ALL_LEVELS')
      return this.translate.instant('programs.catalog.all_levels');
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
