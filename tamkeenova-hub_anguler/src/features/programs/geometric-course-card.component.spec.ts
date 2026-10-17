import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { GeometricCourseCardComponent } from './geometric-course-card.component';
import { Course } from '../../core/models/course-catalog.model';
const sample: Course = {
  id: 'course',
  slug: 'real-course',
  title_ar: 'القيادة',
  title_en: 'Leadership',
  short_description_ar: 'وصف الكورس',
  short_description_en: 'Course description',
  content_type: 'VIDEO',
  language: 'ar',
  is_free: false,
  price: 150,
  duration_minutes: 95,
  lessons_count: 5,
  average_rating: 0,
  ratings_count: 0,
  enrollments_count: 0,
};
describe('Geometric course card data integrity', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [GeometricCourseCardComponent],
      providers: [provideRouter([]), provideTranslateService({ lang: 'en' })],
    }).compileComponents();
  });
  function create(overrides: Partial<Course> = {}) {
    const fixture = TestBed.createComponent(GeometricCourseCardComponent);
    fixture.componentRef.setInput('course', { ...sample, ...overrides });
    fixture.detectChanges();
    return fixture;
  }
  it('uses semantic links, selectable text and a separate toggle button, not a flattened image', () => {
    const f = create();
    expect(f.nativeElement.querySelector('h3').textContent).toBe('Leadership');
    expect(f.nativeElement.querySelector('.course-arrow').getAttribute('href')).toBe(
      '/programs/course/real-course',
    );
    expect(f.nativeElement.querySelector('a button')).toBeNull();
    expect(f.nativeElement.querySelector('.bookmark-control').getAttribute('aria-pressed')).toBe(
      'false',
    );
  });
  it('does not fabricate reviews or bestseller badges', () => {
    const f = create({ ratings_count: 0, average_rating: 4.8 });
    expect(f.nativeElement.querySelector('.course-rating')).toBeNull();
    expect(f.nativeElement.textContent).not.toContain('Bestseller');
    expect(f.nativeElement.querySelector('.badge-new')).toBeNull();
  });
  it.each([
    ['invalid', false],
    [new Date(Date.now() + 86400000).toISOString(), false],
    [new Date(Date.now() - 40 * 86400000).toISOString(), false],
    [new Date(Date.now() - 86400000).toISOString(), true],
  ])('shows New only for a valid recent publication: %s', (published_at, expected) => {
    expect(create({ published_at }).componentInstance.isNew()).toBe(expected);
  });
  it('uses primary category and instructor, including the parent palette for a subcategory', () => {
    const f = create({
      category_links: [
        {
          is_primary: false,
          course_categories: { id: 'other', slug: 'lifestyle', name_ar: '', name_en: '' },
        },
        {
          is_primary: true,
          course_categories: {
            id: 'child',
            slug: 'ai',
            parent_id: 'tech',
            name_ar: 'ذكاء اصطناعي',
            name_en: 'AI',
          },
        },
      ],
      instructors: [
        {
          is_primary: false,
          trainers: { id: 'other', slug: 'other', users: { full_name: 'Other' } },
        },
        {
          is_primary: true,
          trainers: { id: 'primary', slug: 'primary', users: { full_name: 'Primary instructor' } },
        },
      ],
    });
    f.componentRef.setInput('categories', [
      { id: 'tech', slug: 'technology-innovation', name_ar: '', name_en: '' },
    ]);
    f.detectChanges();
    expect(f.componentInstance.theme().color).toBe('#5b3bd1');
    expect(f.nativeElement.querySelector('.instructor-name').textContent).toBe(
      'Primary instructor',
    );
  });
  it('uses distinct clipPath IDs even when the same course appears twice', () => {
    const a = create(),
      b = create();
    expect(a.componentInstance.uid).not.toBe(b.componentInstance.uid);
    expect(a.nativeElement.querySelector('clipPath').id).not.toBe(
      b.nativeElement.querySelector('clipPath').id,
    );
  });
  it('keeps Arabic and English text reactive to the current language', async () => {
    const f = create();
    await TestBed.inject(TranslateService).use('ar');
    f.detectChanges();
    expect(f.nativeElement.querySelector('h3').textContent).toBe('القيادة');
  });
  it('retries image fallbacks when updated course data supplies a new image', () => {
    const f = create({ cover_image_url: '/broken.jpg' });
    f.componentInstance.photoFailed.set(true);
    f.detectChanges();
    expect(f.nativeElement.querySelector('image')).toBeNull();
    f.componentRef.setInput('course', { ...sample, cover_image_url: '/new.jpg' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('image').getAttribute('href')).toBe('/new.jpg');
  });
});
