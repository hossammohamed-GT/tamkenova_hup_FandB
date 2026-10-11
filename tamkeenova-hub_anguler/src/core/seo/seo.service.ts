import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { BreadcrumbItem, DynamicSeo, SeoRouteData } from './seo-config';

const SITE_NAME = 'TamkeeNova HUB';
const DEFAULT_OG_IMAGE = '/images/og-image.jpg';
const MAX_DESCRIPTION = 160;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private router = inject(Router);
  private rootRoute = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private doc = inject(DOCUMENT);

  private dynamic: DynamicSeo | null = null;
  private started = false;

  init(): void {
    if (this.started) return;
    this.started = true;
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.dynamic = null;
      this.clearPageJsonLd();
      this.apply();
      this.applySiteJsonLd();
    });
    this.translate.onLangChange.subscribe(() => {
      this.apply();
      this.applySiteJsonLd();
    });
    this.apply();
    this.applySiteJsonLd();
  }

  setDynamic(dynamic: DynamicSeo): void {
    this.dynamic = dynamic;
    this.apply();
  }

  setJsonLd(id: string, data: Record<string, unknown>): void {
    const head = this.doc.head;
    head.querySelector(`script[data-jsonld="${id}"]`)?.remove();
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-jsonld', id);
    script.textContent = JSON.stringify(data);
    head.appendChild(script);
  }

  setBreadcrumbJsonLd(items: BreadcrumbItem[]): void {
    this.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    });
  }

  absoluteUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${this.doc.location.origin}${clean}`;
  }

  private apply(): void {
    const data = this.routeSeoData();
    const lang = this.currentLang();
    const origin = this.doc.location.origin;
    const path = this.canonicalPath();
    const url = `${origin}${path}`;

    const title = this.dynamic?.title ?? this.translate.instant(data?.titleKey ?? SITE_NAME);
    const fullTitle = this.dynamic?.title || data?.rawTitle ? title : `${title} | ${SITE_NAME}`;
    const rawDescription = this.dynamic?.description ?? this.translate.instant(data?.descriptionKey ?? '');
    const description = this.truncate(rawDescription);
    const indexable = data?.index === true;
    const ogType = this.dynamic?.type ?? data?.ogType ?? 'website';
    const image = this.absoluteUrl(this.dynamic?.image || data?.ogImage || DEFAULT_OG_IMAGE);

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({
      name: 'robots',
      content: indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow',
    });
    this.setCanonical(url);

    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:locale', content: lang === 'ar' ? 'ar_EG' : 'en_US' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  private routeSeoData(): SeoRouteData | null {
    let route = this.rootRoute;
    while (route.firstChild) route = route.firstChild;
    let data: SeoRouteData | null = null;
    let cursor: ActivatedRoute | null = route;
    while (cursor) {
      if (cursor.snapshot.data['seo']) data = cursor.snapshot.data['seo'];
      cursor = cursor.parent;
    }
    return data;
  }

  private canonicalPath(): string {
    const raw = this.router.url.split('?')[0].split('#')[0] || '/';
    if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1);
    return raw;
  }

  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }

  private currentLang(): string {
    return this.translate.currentLang() ?? 'ar';
  }

  private truncate(text: string): string {
    const clean = (text ?? '').replace(/\s+/g, ' ').trim();
    if (clean.length <= MAX_DESCRIPTION) return clean;
    return `${clean.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`;
  }

  private clearPageJsonLd(): void {
    this.doc.head
      .querySelectorAll('script[data-jsonld="breadcrumb"], script[data-jsonld="page"]')
      .forEach((el) => el.remove());
  }

  private applySiteJsonLd(): void {
    const origin = this.doc.location.origin;
    const lang = this.currentLang();
    this.setJsonLd('org', {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      '@id': `${origin}/#organization`,
      name: SITE_NAME,
      ...(lang === 'ar' ? { alternateName: 'تمكينوفا' } : {}),
      url: origin,
      logo: `${origin}/images/logo.svg`,
      email: 'info@tamkeenova.com',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+201013494727',
        email: 'info@tamkeenova.com',
        contactType: 'customer service',
        areaServed: 'EG',
        availableLanguage: ['ar', 'en'],
      },
      areaServed: { '@type': 'Country', name: 'Egypt' },
      sameAs: ['https://www.facebook.com/share/1Ro5wdyHB4/'],
    });
    this.setJsonLd('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: SITE_NAME,
      url: origin,
      inLanguage: ['ar', 'en'],
      publisher: { '@id': `${origin}/#organization` },
    });
  }
}
