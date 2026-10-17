import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { NEVER, Subject, of } from 'rxjs';
import { CourseCategory } from '../../core/models/course-catalog.model';
import { CourseCatalogService } from '../../core/services/course-catalog.service';
import { TrainersService } from '../../core/services/trainers.service';
import { ProgramsComponent } from './programs.component';

const categories: CourseCategory[] = Array.from({ length: 9 }, (_, index) => ({
  id: `category-${index}`,
  slug: index === 0 ? 'technology-innovation' : `category-${index}`,
  name_en: `Category ${index}`,
  name_ar: `مجال ${index}`,
  courses_count: 3,
}));

describe('Programs category loading', () => {
  let response: Subject<CourseCategory[]>;

  beforeEach(async () => {
    response = new Subject<CourseCategory[]>();
    await TestBed.configureTestingModule({
      imports: [ProgramsComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: CourseCatalogService, useValue: {
          getCategories: () => response,
          getCollections: () => NEVER,
          getLearningPrograms: () => NEVER,
          getCourses: () => of({ data: [], meta: { page: 1, total: 0, total_pages: 0 } }),
        } },
        { provide: TrainersService, useValue: { getAll: () => NEVER } },
      ],
    }).compileComponents();
  });

  it('renders the section and nine non-interactive placeholders before data arrives', () => {
    const fixture = TestBed.createComponent(ProgramsComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#category-heading')).toBeTruthy();
    expect(el.querySelector('.category-grid')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelectorAll('.category-skeleton')).toHaveLength(9);
    expect(el.querySelectorAll('button.category-tile')).toHaveLength(0);
  });

  it('shows categories without waiting for trainers, collections or learning programs', () => {
    const fixture = TestBed.createComponent(ProgramsComponent);
    fixture.detectChanges();
    response.next(categories);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('button.category-tile')).toHaveLength(9);
    expect(el.querySelectorAll('.category-skeleton')).toHaveLength(0);
    expect(el.querySelector('.category-grid')?.getAttribute('aria-busy')).toBe('false');
    expect(el.querySelector('img.category-image')?.getAttribute('loading')).toBe('eager');
    expect(fixture.componentInstance.categoryCount()).toBe(9);
    expect(fixture.componentInstance.catalogUnavailable()).toBe(false);
  });

  it('keeps a category failure separate from the course results and supports retry', () => {
    const fixture = TestBed.createComponent(ProgramsComponent);
    response.error(new Error('offline'));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.category-load-error')).toBeTruthy();
    expect(fixture.componentInstance.catalogUnavailable()).toBe(false);
    response = new Subject<CourseCategory[]>();
    el.querySelector<HTMLButtonElement>('.category-load-error button')!.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.category-skeleton')).toHaveLength(9);
    response.next(categories);
    fixture.detectChanges();
    expect(el.querySelector('.category-load-error')).toBeNull();
    expect(el.querySelectorAll('button.category-tile')).toHaveLength(9);
  });

  it('removes loading placeholders for a successful empty response', () => {
    const fixture = TestBed.createComponent(ProgramsComponent);
    response.next([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoadingCategories()).toBe(false);
    expect(fixture.nativeElement.querySelector('.category-section')).toBeNull();
  });

  it('renders every API category immediately without pagination or an expand button', () => {
    const fixture = TestBed.createComponent(ProgramsComponent);
    response.next(categories);
    fixture.detectChanges();
    expect(fixture.componentInstance.displayedCategories()).toHaveLength(9);
    expect(fixture.nativeElement.querySelectorAll('button.category-tile')).toHaveLength(9);
    expect(fixture.nativeElement.querySelector('.category-controls')).toBeNull();
  });

  it('unsubscribes from category requests when leaving the page', () => {
    const fixture = TestBed.createComponent(ProgramsComponent);
    fixture.destroy();
    response.next(categories);
    expect(fixture.componentInstance.categories()).toEqual([]);
  });
});

describe('Catalog request lifecycle', () => {
  it('ignores superseded search responses rather than replacing the latest results', async () => {
    const first = new Subject<any>(), latest = new Subject<any>();
    const getCourses = vi.fn().mockReturnValueOnce(first).mockReturnValue(latest);
    await TestBed.configureTestingModule({ imports: [ProgramsComponent], providers: [
      provideRouter([]), provideTranslateService(),
      { provide: CourseCatalogService, useValue: { getCategories: () => NEVER, getCollections: () => NEVER, getLearningPrograms: () => NEVER, getCourses } },
      { provide: TrainersService, useValue: { getAll: () => NEVER } },
    ] }).compileComponents();
    const f = TestBed.createComponent(ProgramsComponent);
    f.componentInstance.searchInput = 'new search'; f.componentInstance.submitSearch();
    first.next({ data: [{ id: 'stale' }], meta: { total: 900 } });
    expect(f.componentInstance.courses()).toEqual([]);
    latest.next({ data: [], meta: { total: 2, total_pages: 1, page: 1 } });
    expect(f.componentInstance.totalCourses()).toBe(2);
    expect(f.componentInstance.catalogUnavailable()).toBe(false);
    f.destroy();
  });
  it('cancels in-flight course requests on navigation away', async () => {
    const pending = new Subject<any>();
    await TestBed.configureTestingModule({ imports: [ProgramsComponent], providers: [
      provideRouter([]), provideTranslateService(),
      { provide: CourseCatalogService, useValue: { getCategories: () => NEVER, getCollections: () => NEVER, getLearningPrograms: () => NEVER, getCourses: () => pending } },
      { provide: TrainersService, useValue: { getAll: () => NEVER } },
    ] }).compileComponents();
    const f = TestBed.createComponent(ProgramsComponent); f.destroy();
    pending.next({ data: [{ id: 'late' }], meta: { total: 50 } });
    expect(f.componentInstance.courses()).toEqual([]);
  });
});
