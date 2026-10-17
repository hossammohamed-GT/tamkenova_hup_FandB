import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { SEO_PUBLIC_ORIGIN, SeoService } from './seo.service';

describe('SEO route, privacy and structured-data boundaries', () => {
  let events: Subject<unknown>, route: any, router: any;
  function create(origin = document.location.origin) {
    events = new Subject();
    const parent = {
      snapshot: {
        data: { seo: { titleKey: 'Parent', descriptionKey: 'Parent description', index: true } },
      },
      parent: null,
    };
    route = {
      snapshot: {
        data: { seo: { titleKey: 'Course', descriptionKey: 'Course description', index: true } },
      },
      parent,
    };
    router = { url: '/programs/course/test/?tracking=private#section', events };
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService({ lang: 'en' }),
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: SEO_PUBLIC_ORIGIN, useValue: origin },
      ],
    });
    const service = TestBed.inject(SeoService);
    service.init();
    return service;
  }
  beforeEach(() => {
    document.head
      .querySelectorAll('meta, link[rel="canonical"], script[data-jsonld]')
      .forEach((item) => item.remove());
  });
  it('uses the most specific route metadata and a single query-free canonical', () => {
    const service = create();
    expect(document.title).toBe('Course | TamkeeNova HUB');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      document.location.origin + '/programs/course/test',
    );
    service.init();
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'index, follow',
    );
  });
  it('never inherits public indexability over a private child route', () => {
    create();
    route.snapshot.data.seo = { titleKey: 'Login', descriptionKey: 'Private' };
    router.url = '/login';
    events.next(new NavigationEnd(1, '/login', '/login'));
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex',
    );
  });
  it('noindexes preview hosts while pointing canonical and organization URLs to the public site', () => {
    create('https://public.example.test');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://public.example.test/programs/course/test',
    );
    expect(JSON.parse(document.querySelector('script[data-jsonld="org"]')!.textContent!).url).toBe(
      'https://public.example.test',
    );
  });
  it('retains dynamic metadata set during activation, then clears it on the next navigation', () => {
    const service = create();
    events.next(new NavigationStart(1, '/programs/course/test'));
    service.setDynamic({ title: 'Real course', description: 'Real description' });
    events.next(new NavigationEnd(1, router.url, router.url));
    expect(document.title).toBe('Real course');
    events.next(new NavigationStart(2, '/team'));
    events.next(new NavigationEnd(2, '/team', '/team'));
    expect(document.title).toBe('Course | TamkeeNova HUB');
  });
  it('blocks indexing and removes page schemas for missing/loading/failed resources', () => {
    const service = create();
    service.setJsonLd('page', { name: 'Old page' });
    service.setPageIndexable(false);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex',
    );
    expect(document.querySelector('script[data-jsonld="page"]')).toBeNull();
    service.setPageIndexable(true);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'index, follow',
    );
  });
  it('rejects executable/protocol-relative/credential-bearing image URLs and unsafe JSON-LD identifiers', () => {
    const service = create();
    for (const image of [
      'javascript:alert(1)',
      '//evil.test/p.png',
      'https://user:pass@evil.test/a.png',
      '/\\evil.test/a.png',
    ]) {
      service.setDynamic({
        title: 'Safe',
        description: '<b>Plain</b> ' + 'word '.repeat(80),
        image,
      });
      expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
        document.location.origin + '/images/og-image.jpg',
      );
      expect(
        document.querySelector('meta[name="description"]')?.getAttribute('content')!.length,
      ).toBeLessThanOrEqual(160);
      expect(
        document.querySelector('meta[name="description"]')?.getAttribute('content'),
      ).not.toContain('<b>');
    }
    expect(() => service.setJsonLd('bad"]script', {})).toThrow();
  });
  it('serializes untrusted schema content as data, without executable markup', () => {
    const service = create();
    const name = '</script><script>alert(1)</script>';
    service.setJsonLd('page', { name });
    const script = document.querySelector('script[data-jsonld="page"]')!;
    expect(script.textContent).not.toContain('<');
    expect(JSON.parse(script.textContent!).name).toBe(name);
    expect(document.querySelectorAll('script[data-jsonld="page"]')).toHaveLength(1);
  });
  it('updates language, direction and sharing locale together', () => {
    create();
    TestBed.inject(TranslateService).use('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe(
      'ar_EG',
    );
    TestBed.inject(TranslateService).use('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(
      document.querySelector('meta[property="og:locale:alternate"]')?.getAttribute('content'),
    ).toBe('ar_EG');
  });
});
