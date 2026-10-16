import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import { CourseCatalogService } from '../../../core/services/course-catalog.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ProgramsMegaMenuComponent } from './programs-mega-menu.component';
import { CourseListResponse } from '../../../core/models/course-catalog.model';

const categories = [
  {id:'business',slug:'business-professional-skills',name_en:'Business',name_ar:'أعمال'},
  {id:'tech',slug:'technology-innovation',name_en:'Technology',name_ar:'تكنولوجيا'},
];
const response = (id: string) => ({data:[{id, title_en:id, title_ar:id}],meta:{total:1}} as CourseListResponse);
describe('Programs mega menu', () => {
  const language = signal('en');
  let requests: Subject<CourseListResponse>[];
  let queries: any[];
  beforeEach(async () => {
    requests = []; queries = []; language.set('en');
    await TestBed.configureTestingModule({imports:[ProgramsMegaMenuComponent],providers:[
      provideRouter([]), provideTranslateService(),
      {provide:ThemeService,useValue:{language}},
      {provide:CourseCatalogService,useValue:{
        getCategories:() => of(categories),
        getCourses:(query: any) => {queries.push(query); const request=new Subject<CourseListResponse>();requests.push(request);return request;},
      }},
    ]}).compileComponents();
  });
  it('coalesces warmed requests and does not replace the selected list with another response', () => {
    const fixture=TestBed.createComponent(ProgramsMegaMenuComponent);
    const component=fixture.componentInstance;
    component.selectCategory(categories[1]);
    requests[0].next(response('stale'));
    requests[1].next(response('current'));
    expect(component.courses()[0].id).toBe('current');
    expect(queries[1]).toMatchObject({category:'technology-innovation',sort:'popular',limit:4});
    component.selectCategory(categories[0]);
    expect(component.loadingCourses()).toBe(false);
    expect(component.courses()[0].id).toBe('stale');
    expect(requests).toHaveLength(2);
  });
  it('warms categories before interaction and retries failed background requests', () => {
    const fixture = TestBed.createComponent(ProgramsMegaMenuComponent);
    const component = fixture.componentInstance;
    expect(queries.map(query => query.category)).toEqual(categories.map(category => category.slug));
    requests[1].error(new Error('background offline'));
    expect(component.coursesError()).toBe(false);
    component.selectCategory(categories[1]);
    expect(requests).toHaveLength(3);
    requests[2].next(response('retry')); requests[2].complete();
    expect(component.courses()[0].id).toBe('retry');
  });
  it('caches a successful category/sort response and requests the actual server sort', () => {
    const fixture=TestBed.createComponent(ProgramsMegaMenuComponent);
    const component=fixture.componentInstance;
    requests[0].next(response('popular')); requests[0].complete();
    component.selectSort('rating');
    expect(queries[2].sort).toBe('rating');
    requests[2].next(response('rated')); requests[2].complete();
    component.selectSort('popular');
    expect(requests).toHaveLength(3);
    expect(component.courses()[0].id).toBe('popular');
  });
  it('can retry course failures and keeps category navigation available', () => {
    const fixture=TestBed.createComponent(ProgramsMegaMenuComponent);
    const component=fixture.componentInstance;
    requests[0].error(new Error('offline'));
    expect(component.coursesError()).toBe(true);
    expect(component.categories()).toHaveLength(2);
    component.loadCourses(); requests[2].next(response('recovered'));
    expect(component.coursesError()).toBe(false);
    expect(component.courses()[0].id).toBe('recovered');
  });
  it('updates localized names and unsubscribes when the navbar is destroyed', () => {
    const fixture=TestBed.createComponent(ProgramsMegaMenuComponent);
    const component=fixture.componentInstance;
    expect(component.categoryName(categories[0])).toBe('Business');
    language.set('ar'); expect(component.categoryName(categories[0])).toBe('أعمال');
    fixture.destroy(); requests[0].next(response('late'));
    expect(component.courses()).toEqual([]);
  });
});
