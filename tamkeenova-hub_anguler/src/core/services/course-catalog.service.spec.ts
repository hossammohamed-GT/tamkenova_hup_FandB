import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CourseCatalogService } from './course-catalog.service';

describe('Course category preload cache', () => {
  let service: CourseCatalogService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
    service = TestBed.inject(CourseCatalogService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('shares one request between navbar and Programs and replays it without refetching', () => {
    const navbar = vi.fn(); const programs = vi.fn(); const reopened = vi.fn();
    service.getCategories().subscribe(navbar);
    service.getCategories().subscribe(programs);
    const data = [{id:'business',slug:'business',name_ar:'أعمال',name_en:'Business'}];
    http.expectOne('/api/courses/categories').flush({data});
    service.getCategories().subscribe(reopened);
    expect(navbar).toHaveBeenCalledWith(data);
    expect(programs).toHaveBeenCalledWith(data);
    expect(reopened).toHaveBeenCalledWith(data);
    http.expectNone('/api/courses/categories');
  });
  it('does not permanently cache a network failure; retry performs a fresh request', () => {
    const failed = vi.fn(); const recovered = vi.fn();
    service.getCategories().subscribe({error:failed});
    http.expectOne('/api/courses/categories').flush({}, {status:503,statusText:'Offline'});
    expect(failed).toHaveBeenCalledTimes(1);
    service.getCategories().subscribe(recovered);
    http.expectOne('/api/courses/categories').flush({data:[]});
    expect(recovered).toHaveBeenCalledWith([]);
  });
});

it('refreshes all mounted category consumers after an admin mutation, without duplicate requests', () => {
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
  const service=TestBed.inject(CourseCatalogService), http=TestBed.inject(HttpTestingController);
  const navbar=vi.fn(), programs=vi.fn();
  service.getCategories().subscribe(navbar);service.getCategories().subscribe(programs);
  http.expectOne('/api/courses/categories').flush({data:[]});
  service.refreshCategories();
  const data=[{id:'new',slug:'new',name_ar:'جديد',name_en:'New'}];
  http.expectOne('/api/courses/categories').flush({data});
  expect(navbar).toHaveBeenLastCalledWith(data);expect(programs).toHaveBeenLastCalledWith(data);
  http.verify();
});
