import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { CourseDetailsComponent } from './course-details.component';
import { CourseCatalogService } from '../../../core/services/course-catalog.service';
import { AuthService } from '../../../core/services/auth.service';
import { Course } from '../../../core/models/course-catalog.model';
import { vi } from 'vitest';
const course = {
  id: 'course',
  slug: 'course',
  title_en: 'Course',
  title_ar: 'كورس',
  is_free: true,
  language: 'ar',
  preview_video_url: 'https://youtu.be/5BciHXh074k',
  sections: [
    { id: 'two', title_en: 'Second', title_ar: 'الثاني', position: 1 },
    { id: 'one', title_en: 'First', title_ar: 'الأول', position: 0 },
  ],
  lessons: [
    {
      id: 'second',
      section_id: 'two',
      title_en: 'Second lesson',
      title_ar: 'الثاني',
      is_preview: false,
      position: 1,
      media_url: 'https://youtu.be/M7lc1UVf-VE',
      duration_minutes: 2,
    },
    {
      id: 'first',
      section_id: 'one',
      title_en: 'First lesson',
      title_ar: 'الأول',
      is_preview: true,
      position: 0,
      media_url: 'https://youtu.be/5BciHXh074k',
      duration_minutes: 1,
    },
  ],
} as Course;
describe('Course introduction and chapters', () => {
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let api: {
    getCourseBySlug: ReturnType<typeof vi.fn>;
    getCourseAccess: ReturnType<typeof vi.fn>;
    getLessonPlayback: ReturnType<typeof vi.fn>;
  };
  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ slug: 'course' }));
    api = {
      getCourseBySlug: vi.fn(() => of(course)),
      getCourseAccess: vi.fn(() => of({ can_watch: false })),
      getLessonPlayback: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [CourseDetailsComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: CourseCatalogService, useValue: api },
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
      ],
    }).compileComponents();
  });
  it('starts on the introduction and groups ordered lessons by ordered chapters', () => {
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    expect(component.videoUrl()).toBe(course.preview_video_url);
    expect(component.selectedLesson()).toBeNull();
    expect(component.chapters().map((c) => c.id)).toEqual(['one', 'two']);
    expect(component.lessons().map((l) => l.id)).toEqual(['first', 'second']);
    component.navigateLesson(1);
    expect(component.selectedLesson()?.id).toBe('first');
    component.navigateLesson(1);
    expect(component.selectedLesson()?.id).toBe('second');
    component.selectLesson(null);
    expect(component.videoUrl()).toBe(course.preview_video_url);
  });
  it('keeps legacy lessons under a fallback chapter', () => {
    api.getCourseBySlug.mockReturnValue(
      of({
        ...course,
        sections: [],
        lessons: course.lessons!.map((l) => ({ ...l, section_id: null })),
      }),
    );
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    expect(component.chapters()[0].id).toBe('ungrouped');
    expect(component.chapters()[0].lessons).toHaveLength(2);
  });
  it('keeps paid content locked but allows a flagged preview', () => {
    api.getCourseBySlug.mockReturnValue(of({ ...course, is_free: false }));
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    component.selectLesson(course.lessons![0]);
    expect(component.accessNotice()).toBe(true);
    expect(api.getLessonPlayback).not.toHaveBeenCalled();
    component.selectLesson(course.lessons![1]);
    expect(component.accessNotice()).toBe(false);
    expect(component.selectedLesson()?.id).toBe('first');
  });
  it('cancels stale requests when selecting another course on the same route', () => {
    const old = new Subject<Course>();
    api.getCourseBySlug.mockReturnValueOnce(old);
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    params.next(convertToParamMap({ slug: 'new' }));
    old.next({ ...course, title_en: 'Stale' });
    expect(component.course()?.title_en).toBe('Course');
    expect(old.observed).toBe(false);
  });
  it('distinguishes a server error from not found, and supports retry', () => {
    const request = new Subject<Course>();
    api.getCourseBySlug.mockReturnValueOnce(request);
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    request.error({ status: 503 });
    expect(component.loadError()).toBe(true);
    expect(component.notFound()).toBe(false);
    component.retry();
    expect(component.loadError()).toBe(false);
    expect(component.course()?.id).toBe('course');
  });
  it('cancels an old protected playback response after a new selection', () => {
    TestBed.overrideProvider(AuthService, { useValue: { isLoggedIn: () => true } });
    api.getCourseBySlug.mockReturnValue(of({ ...course, is_free: false }));
    api.getCourseAccess.mockReturnValue(of({ can_watch: true }));
    const request = new Subject<{ id: string; media_url: string }>();
    api.getLessonPlayback.mockReturnValue(request);
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    component.selectLesson(course.lessons![0]);
    expect(component.playbackBusy()).toBe(true);
    component.selectLesson(null);
    request.next({ id: 'second', media_url: 'stale' });
    expect(component.videoUrl()).toBe(course.preview_video_url);
    expect(component.selectedLesson()).toBeNull();
    expect(request.observed).toBe(false);
  });
});
