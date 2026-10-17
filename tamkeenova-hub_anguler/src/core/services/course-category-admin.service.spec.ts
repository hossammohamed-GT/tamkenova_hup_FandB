import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  CourseCategoryAdminService,
  InvalidCategoryListResponse,
} from './course-category-admin.service';

describe('Admin category list response contract', () => {
  let service: CourseCategoryAdminService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CourseCategoryAdminService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('accepts an explicitly empty successful list', () => {
    const next = vi.fn();
    service.list().subscribe(next);
    http.expectOne('/api/admin/course-categories').flush({ success: true, data: [] });
    expect(next).toHaveBeenCalledWith([]);
  });
  it('accepts management data including reference counts', () => {
    const data = [
      {
        id: 'one',
        name_ar: 'تصنيف',
        name_en: 'Category',
        is_active: true,
        _count: { children: 0, course_links: 2, learning_programs: 0 },
      },
    ];
    const next = vi.fn();
    service.list().subscribe(next);
    http.expectOne(service.endpoint).flush({ data });
    expect(next).toHaveBeenCalledWith(data);
  });
  it.each([
    null,
    {},
    { data: null },
    { data: {} },
    { data: [null] },
    { data: [{ id: 'public-category', name_ar: 'تصنيف', name_en: 'Category' }] },
    {
      data: [
        {
          id: 'one',
          name_ar: 'تصنيف',
          name_en: 'Category',
          is_active: true,
          _count: { children: -1, course_links: 0, learning_programs: 0 },
        },
      ],
    },
    '<!doctype html><html>SPA fallback</html>',
  ])(
    'rejects malformed or incompatible payload instead of inventing an empty list: %j',
    (response) => {
      const next = vi.fn(),
        error = vi.fn();
      service.list().subscribe({ next, error });
      http.expectOne(service.endpoint).flush(response);
      expect(next).not.toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(InvalidCategoryListResponse);
    },
  );
  it('preserves HTTP failure status and allows a fresh retry', () => {
    const error = vi.fn(),
      next = vi.fn();
    service.list().subscribe({ error });
    http.expectOne(service.endpoint).flush('Not found', { status: 404, statusText: 'Not Found' });
    expect(error.mock.calls[0][0]).toBeInstanceOf(HttpErrorResponse);
    expect(error.mock.calls[0][0].status).toBe(404);
    service.list().subscribe(next);
    http.expectOne(service.endpoint).flush({ data: [] });
    expect(next).toHaveBeenCalledWith([]);
  });
});
