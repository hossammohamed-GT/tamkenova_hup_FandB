import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BreadcrumbItem, DynamicSeo, SeoRouteData } from './seo-config';

const SITE_NAME = 'TamkeeNova HUB';
const DEFAULT_OG_IMAGE = '/images/og-image.jpg';
export const SEO_PUBLIC_ORIGIN = new InjectionToken<string>('SEO_PUBLIC_ORIGIN', {
  providedIn: 'root',
  factory: () => 'https://tamkeenova-hub.vercel.app',
});

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly rootRoute = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly doc = inject(DOCUMENT);
  private readonly origin = new URL(inject(SEO_PUBLIC_ORIGIN)).origin;
  private dynamic: DynamicSeo | null = null;
  private pageIndexable = true;
  private started = false;

  init(): void {
    if (this.started) return;
    this.started = true;
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.dynamic = null;
        this.pageIndexable = true;
        this.clearPageJsonLd();
      }
      if (event instanceof NavigationEnd) {
        this.apply();
        this.applySiteJsonLd();
      }
    });
    this.translate.onLangChange.subscribe(() => {
      this.apply();
      this.applySiteJsonLd();
    });
    this.apply();
    this.applySiteJsonLd();
  }

  setPageIndexable(indexable: boolean): void {
    this.pageIndexable = indexable;
    this.apply();
    if (!indexable) this.clearPageJsonLd();
  }

  setDynamic(dynamic: DynamicSeo): void {
    this.dynamic = dynamic;
    this.apply();
  }

  setJsonLd(id: string, data: Record<string, unknown>): void {
    if (!/^[a-z][a-z0-9-]{0,40}$/i.test(id)) throw new Error('Invalid structured-data identifier');
    this.doc.head.querySelector(`script[data-jsonld="${id}"]`)?.remove();
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-jsonld', id);
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.doc.head.appendChild(script);
  }

  setBreadcrumbJsonLd(items: BreadcrumbItem[]): void {
    this.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    });
  }

  absoluteUrl(path: string): string {
    return this.safeUrl(path) ?? this.origin + '/';
  }

  private safeUrl(value: string): string | null {
    if (!value || value.startsWith('//') || value.includes('\\')) return null;
    if (!/^https?:\/\//i.test(value) && !value.startsWith('/')) return null;
    try {
      const url = new URL(value, this.origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  private apply(): void {
    const data = this.routeSeoData();
    const lang = this.currentLang();
    const url = this.origin + this.canonicalPath();
    const title = this.dynamic?.title ?? this.translate.instant(data?.titleKey ?? 'seo.home.title');
    const fullTitle = this.dynamic?.title || data?.rawTitle ? title : `${title} | ${SITE_NAME}`;
    const description = this.truncate(
      this.dynamic?.description ??
        this.translate.instant(data?.descriptionKey ?? 'seo.home.description'),
    );
    const indexable =
      this.doc.location.origin === this.origin && data?.index === true && this.pageIndexable;
    const image =
      this.safeUrl(this.dynamic?.image || data?.ogImage || DEFAULT_OG_IMAGE) ??
      this.absoluteUrl(DEFAULT_OG_IMAGE);

    this.doc.documentElement.lang = lang;
    this.doc.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({
      name: 'robots',
      content: indexable
        ? 'index, follow, max-image-preview:large'
        : 'noindex, nofollow, noarchive',
    });
    this.setCanonical(url);
    for (const [property, content] of Object.entries({
      'og:title': fullTitle,
      'og:description': description,
      'og:type': this.dynamic?.type ?? data?.ogType ?? 'website',
      'og:url': url,
      'og:image': image,
      'og:image:alt': fullTitle,
      'og:site_name': SITE_NAME,
      'og:locale': lang === 'ar' ? 'ar_EG' : 'en_US',
      'og:locale:alternate': lang === 'ar' ? 'en_US' : 'ar_EG',
    }))
      this.meta.updateTag({ property, content });
    if (image !== this.absoluteUrl(DEFAULT_OG_IMAGE)) {
      this.meta.removeTag('property="og:image:width"');
      this.meta.removeTag('property="og:image:height"');
    } else {
      this.meta.updateTag({ property: 'og:image:width', content: '1200' });
      this.meta.updateTag({ property: 'og:image:height', content: '630' });
    }
    for (const [name, content] of Object.entries({
      'twitter:card': 'summary_large_image',
      'twitter:title': fullTitle,
      'twitter:description': description,
      'twitter:image': image,
      'twitter:image:alt': fullTitle,
    }))
      this.meta.updateTag({ name, content });
  }

  private routeSeoData(): SeoRouteData | null {
    let route = this.rootRoute;
    while (route.firstChild) route = route.firstChild;
    let cursor: ActivatedRoute | null = route;
    while (cursor) {
      if (cursor.snapshot?.data?.['seo']) return cursor.snapshot?.data?.['seo'];
      cursor = cursor.parent;
    }
    return null;
  }

  private canonicalPath(): string {
    const raw = this.router.url.split('?')[0].split('#')[0] || '/';
    return '/' + raw.replace(/^\/+|\/+$/g, '');
  }

  private setCanonical(url: string): void {
    const links = this.doc.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]');
    let link = links[0];
    links.forEach((item, index) => {
      if (index) item.remove();
    });
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }

  private currentLang(): string {
    return this.translate.currentLang() === 'en' ? 'en' : 'ar';
  }

  private truncate(text: string): string {
    const clean = (text ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return clean.length <= 160 ? clean : `${clean.slice(0, 159).trimEnd()}…`;
  }

  private clearPageJsonLd(): void {
    this.doc.head
      .querySelectorAll('script[data-jsonld="breadcrumb"], script[data-jsonld="page"]')
      .forEach((element) => element.remove());
  }

  private applySiteJsonLd(): void {
    this.setJsonLd('org', {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      '@id': `${this.origin}/#organization`,
      name: SITE_NAME,
      alternateName: 'تمكينوفا',
      url: this.origin,
      logo: this.absoluteUrl('/images/logo.svg'),
    });
    this.setJsonLd('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${this.origin}/#website`,
      name: SITE_NAME,
      url: this.origin,
      inLanguage: ['ar', 'en'],
      publisher: { '@id': `${this.origin}/#organization` },
    });
  }
}
