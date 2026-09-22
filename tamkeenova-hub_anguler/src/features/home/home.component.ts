import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, signal, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PartnersService } from '../../core/services/partners.service';
import { StrategicPartner } from '../../core/models/partner.model';
import { FooterComponent } from '../../shared/components/footer/footer.component';
// import { TrainersShowcaseComponent } from '../trainers-showcase/trainers-showcase.component';
import { TrainersShowcaseComponent } from './trainers-showcase/trainers-showcase.component';
interface ServiceCard {
  icon: string;
  titleKey: string;
  descKey: string;
  linkKey: string;
  route: string;
}

interface PartnerSlot {
  currentImg: string;
  nextImg: string;
  currentHref: string | null;
  nextHref: string | null;
  currentAlt: string;
  nextAlt: string;
  sliding: boolean;
  resetting: boolean;
}

interface PartnerCard {
  img: string;
  href: string | null;
  alt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslatePipe, FooterComponent, TrainersShowcaseComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private partnersService = inject(PartnersService);
  heroImages = [
    '/images/gallery/gallery-01.jpg',
    '/images/gallery/gallery-13.jpg',
    '/images/gallery/gallery-14.jpg',
    '/images/gallery/gallery-15.jpg',
  ];
  activeHeroIndex = signal(0);
  private heroTimer?: ReturnType<typeof setInterval>;

  galleryImages: string[] = [
    '/images/gallery/gallery-16.jpg',
    '/images/gallery/gallery-17.jpg',
    '/images/gallery/gallery-21.jpg',
  ];

  stats: { value: number; suffix: string; labelKey: string; descKey: string }[] = [
    { value: 7, suffix: '+', labelKey: 'home.stats.trainees', descKey: 'home.stats.trainees_desc' },
    { value: 6, suffix: '+', labelKey: 'home.stats.programs', descKey: 'home.stats.programs_desc' },
    { value: 155, suffix: '+', labelKey: 'home.stats.hours', descKey: 'home.stats.hours_desc' },
    { value: 5, suffix: '+', labelKey: 'home.stats.partnerships', descKey: 'home.stats.partnerships_desc' },
    { value: 20, suffix: '+', labelKey: 'home.stats.team', descKey: 'home.stats.team_desc' },
  ];

  statValues = signal<number[]>([0, 0, 0, 0, 0]);
  statsVisible = signal(false);
  statsSection = viewChild<ElementRef<HTMLElement>>('statsSection');
  private statsObserver?: IntersectionObserver;
  private statRafs: number[] = [];
  private statsAnimated = false;

  services: ServiceCard[] = [
    {
      icon: 'fa-solid fa-award',
      titleKey: 'home.services.portal.title',
      descKey: 'home.services.portal.desc',
      linkKey: 'home.services.portal.link',
      route: '/portal',
    },
    {
      icon: 'fa-solid fa-book-open',
      titleKey: 'home.services.programs.title',
      descKey: 'home.services.programs.desc',
      linkKey: 'home.services.programs.link',
      route: '/programs',
    },
    {
      icon: 'fa-solid fa-briefcase',
      titleKey: 'home.services.consulting.title',
      descKey: 'home.services.consulting.desc',
      linkKey: 'home.services.consulting.link',
      route: '/consulting',
    },
  ];


  private partnerCards: PartnerCard[] = [];
  partners = signal<StrategicPartner[]>([]);

  private readonly slotsCount = 5;
  private readonly staggerMs = 220;
  private readonly slideDurationMs = 650;
  private readonly wavePauseMs = 2200;

  private slotPointers: number[] = [];
  private partnerTimers: ReturnType<typeof setTimeout>[] = [];
  private partnerRafs: number[] = [];

  slots = signal<PartnerSlot[]>([]);

  whatsappUrl =
    'https://api.whatsapp.com/send/?phone=201013494727&text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B+TamkeeNova+HUB+%D8%A8%D8%AE%D8%B5%D9%88%D8%B5...&type=phone_number&app_absent=0';

  contactChannels: {
    key: string;
    icon: string;
    labelKey: string;
    value: string;
    href: string;
    external?: boolean;
  }[] = [
    {
      key: 'phone',
      icon: 'fa-solid fa-phone',
      labelKey: 'contact.phone_label',
      value: '01013494727',
      href: 'tel:01013494727',
    },
    {
      key: 'email',
      icon: 'fa-solid fa-envelope',
      labelKey: 'contact.email_label',
      value: 'info@tamkeenova.com',
      href: 'mailto:info@tamkeenova.com',
    },
    {
      key: 'facebook',
      icon: 'fa-brands fa-facebook-f',
      labelKey: 'contact.facebook_label',
      value: 'TamkeeNova HUB',
      href: 'https://www.facebook.com/share/1Ro5wdyHB4/',
      external: true,
    },
  ];

  ngOnInit(): void {
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    if (!prefersReduced) {
      this.heroTimer = setInterval(() => {
        this.activeHeroIndex.set((this.activeHeroIndex() + 1) % this.heroImages.length);
      }, 5000);
    }

    this.partnersService.listPublic().subscribe({
      next: (partners) => {
        this.partners.set(partners ?? []);
        this.partnerCards = (partners ?? []).map((partner) => ({
          img: partner.logo_url,
          href: partner.website_url || null,
          alt: partner.name_en || partner.name_ar || 'partner logo',
        }));
        this.preloadPartnerLogos();
        this.initPartnersWave();
      },
      error: () => this.initPartnersWave(),
    });
  }

  ngAfterViewInit(): void {
    const el = this.statsSection()?.nativeElement;
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    if (!el || prefersReduced || typeof IntersectionObserver === 'undefined') {
      this.revealStats(true);
      return;
    }
    this.statsObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.revealStats(false);
          this.statsObserver?.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    this.statsObserver.observe(el);
  }

  ngOnDestroy(): void {
    if (this.heroTimer) clearInterval(this.heroTimer);
    this.partnerTimers.forEach((t) => clearTimeout(t));
    this.statsObserver?.disconnect();
    if (typeof cancelAnimationFrame !== 'undefined') {
      this.partnerRafs.forEach((id) => cancelAnimationFrame(id));
      this.statRafs.forEach((id) => cancelAnimationFrame(id));
    }
    this.partnerRafs = [];
    this.statRafs = [];
  }

  private revealStats(instant: boolean): void {
    if (this.statsAnimated) return;
    this.statsAnimated = true;
    this.statsVisible.set(true);
    if (instant) {
      this.statValues.set(this.stats.map((stat) => stat.value));
      return;
    }
    this.stats.forEach((_, i) => {
      const t = setTimeout(() => this.animateStat(i), i * 130);
      this.partnerTimers.push(t);
    });
  }

  private animateStat(index: number): void {
    const target = this.stats[index].value;
    const duration = 1500;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(target * eased);
      this.statValues.update((vals) => vals.map((v, i) => (i === index ? current : v)));
      if (progress < 1) {
        const raf = requestAnimationFrame(tick);
        this.statRafs.push(raf);
      }
    };
    const raf = requestAnimationFrame(tick);
    this.statRafs.push(raf);
  }

  private preloadPartnerLogos(): void {
    if (typeof Image === 'undefined') return;
    for (const card of this.partnerCards) {
      const img = new Image();
      img.decoding = 'async';
      img.src = card.img;
    }
  }

  private initPartnersWave(): void {
    const count = Math.min(this.slotsCount, this.partnerCards.length);
    if (!count) { this.slots.set([]); return; }
    const initial = this.partnerCards.slice(0, count);
    this.slotPointers = initial.map((_, i) => i);
    this.slots.set(
      initial.map((card) => ({
        currentImg: card.img,
        nextImg: card.img,
        currentHref: card.href,
        nextHref: card.href,
        currentAlt: card.alt,
        nextAlt: card.alt,
        sliding: false,
        resetting: false,
      })),
    );

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    // Nothing to rotate with a single logo — sliding it out and back in only looks broken.
    if (prefersReduced || this.partnerCards.length <= 1) return;

    const startDelay = setTimeout(() => {
      this.runWave();
      this.scheduleNextWave();
    }, 1200);
    this.partnerTimers.push(startDelay);
  }

  private scheduleNextWave(): void {
    const waveDuration = (this.slotPointers.length - 1) * this.staggerMs + this.slideDurationMs;
    const totalDelay = waveDuration + this.wavePauseMs;

    const t = setTimeout(() => {
      this.runWave();
      this.scheduleNextWave();
    }, totalDelay);
    this.partnerTimers.push(t);
  }

  private runWave(): void {
    for (let i = 0; i < this.slotPointers.length; i++) {
      const t = setTimeout(() => this.startSlide(i), i * this.staggerMs);
      this.partnerTimers.push(t);
    }
  }

  private startSlide(idx: number): void {
    const current = this.slots();
    if (!current[idx]) return;
    const next = this.pickNextCard(idx);
    // Same logo coming in (e.g. a single partner) — skip instead of sliding it out and back.
    if (next.img === current[idx].currentImg) return;

    // Step 1: swap the incoming frame's image while it still sits at its
    // off-card start position (no transition runs yet).
    const updated = [...current];
    updated[idx] = { ...updated[idx], nextImg: next.img, nextHref: next.href, nextAlt: next.alt };
    this.slots.set(updated);

    // Step 2: on the next frame — after the browser has painted the new logo
    // at the start position — run the slide. Setting src + class in one tick
    // lets the logo pop into the card before/without the movement.
    const raf = requestAnimationFrame(() => {
      const s = this.slots();
      if (!s[idx] || s[idx].sliding) return;
      const u = [...s];
      u[idx] = { ...u[idx], sliding: true };
      this.slots.set(u);

      const t = setTimeout(() => this.finishSlide(idx), this.slideDurationMs);
      this.partnerTimers.push(t);
    });
    this.partnerRafs.push(raf);
  }

  private finishSlide(idx: number): void {
    const s = this.slots();
    if (!s[idx]) return;
    const updated = [...s];
    updated[idx] = {
      currentImg: updated[idx].nextImg,
      nextImg: updated[idx].nextImg,
      currentHref: updated[idx].nextHref,
      nextHref: updated[idx].nextHref,
      currentAlt: updated[idx].nextAlt,
      nextAlt: updated[idx].nextAlt,
      sliding: false,
      resetting: true,
    };
    this.slots.set(updated);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const s2 = this.slots();
        if (!s2[idx]) return;
        const u2 = [...s2];
        u2[idx] = { ...u2[idx], resetting: false };
        this.slots.set(u2);
      });
    });
  }

  private pickNextCard(slotIdx: number): PartnerCard {
    const total = this.partnerCards.length;
    const ptr = (this.slotPointers[slotIdx] + 1) % total;
    this.slotPointers[slotIdx] = ptr;
    return this.partnerCards[ptr];
  }
}
