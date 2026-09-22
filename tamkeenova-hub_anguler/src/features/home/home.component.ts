import { Component, OnDestroy, OnInit, signal, inject } from '@angular/core';
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
  sliding: boolean;
  resetting: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslatePipe, FooterComponent, TrainersShowcaseComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
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

  stats = [
    { value: 7, suffix: '+', labelKey: 'home.stats.trainees' },
    { value: 6, suffix: '+', labelKey: 'home.stats.programs' },
    { value: 155, suffix: '+', labelKey: 'home.stats.hours' },
    { value: 5, suffix: '+', labelKey: 'home.stats.partnerships' },
    { value: 20, suffix: '+', labelKey: 'home.stats.team' },
  ];

  services: ServiceCard[] = [
    {
      icon: 'fa-solid fa-shield-halved',
      titleKey: 'home.services.portal.title',
      descKey: 'home.services.portal.desc',
      linkKey: 'home.services.portal.link',
      route: '/portal',
    },
    {
      icon: 'fa-solid fa-graduation-cap',
      titleKey: 'home.services.programs.title',
      descKey: 'home.services.programs.desc',
      linkKey: 'home.services.programs.link',
      route: '/programs',
    },
    {
      icon: 'fa-solid fa-handshake',
      titleKey: 'home.services.consulting.title',
      descKey: 'home.services.consulting.desc',
      linkKey: 'home.services.consulting.link',
      route: '/consulting',
    },
  ];

  partnersImages: string[] = [];
  partners = signal<StrategicPartner[]>([]);

  private readonly slotsCount = 5;
  private readonly staggerMs = 220;
  private readonly slideDurationMs = 650;
  private readonly wavePauseMs = 2200;

  private slotPointers: number[] = [];
  private partnerTimers: ReturnType<typeof setTimeout>[] = [];

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
        this.partnersImages = (partners ?? []).map((partner) => partner.logo_url);
        this.initPartnersWave();
      },
      error: () => this.initPartnersWave(),
    });
  }

  ngOnDestroy(): void {
    if (this.heroTimer) clearInterval(this.heroTimer);
    this.partnerTimers.forEach((t) => clearTimeout(t));
  }

  private initPartnersWave(): void {
    const count = Math.min(this.slotsCount, this.partnersImages.length);
    if (!count) { this.slots.set([]); return; }
    // Warm the browser cache for every logo so slides never run on empty imgs.
    if (typeof window !== 'undefined') {
      for (const src of this.partnersImages) {
        const warm = new Image();
        warm.src = src;
      }
    }
    const initial = this.partnersImages.slice(0, count);
    this.slotPointers = initial.map((_, i) => i);
    this.slots.set(
      initial.map((img) => ({ currentImg: img, nextImg: img, sliding: false, resetting: false })),
    );

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    if (prefersReduced) return;

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
    this.trySlide(idx, 0);
  }

  // Slide only between decoded images: sliding an unloaded logo makes it pop
  // in statically after the motion instead of riding it. Broken/slow URLs are
  // skipped past so one bad logo never freezes a slot; the pointer advances
  // only onto the logo that actually slides (no silent skips on overlap).
  private trySlide(idx: number, attempts: number): void {
    const slots = this.slots();
    const total = this.partnersImages.length;
    if (!slots[idx] || slots[idx].sliding || !total || attempts >= total) return;
    const ptr = (this.slotPointers[idx] + 1) % total;
    const candidate = this.partnersImages[ptr];

    const go = () => {
      const live = this.slots();
      if (!live[idx] || live[idx].sliding) return;
      this.slotPointers[idx] = ptr;
      const updated = [...live];
      updated[idx] = { ...updated[idx], nextImg: candidate, sliding: true };
      this.slots.set(updated);
      const t = setTimeout(() => this.finishSlide(idx), this.slideDurationMs);
      this.partnerTimers.push(t);
    };
    const skip = () => {
      this.slotPointers[idx] = ptr;
      this.trySlide(idx, attempts + 1);
    };

    if (typeof window === 'undefined') { go(); return; }
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; skip(); } }, 2000);
    this.partnerTimers.push(timer);
    const probe = new Image();
    probe.onload = () => { if (!settled) { settled = true; clearTimeout(timer); go(); } };
    probe.onerror = () => { if (!settled) { settled = true; clearTimeout(timer); skip(); } };
    probe.src = candidate;
    if (probe.complete) {
      if (!settled) { settled = true; clearTimeout(timer); if (probe.naturalWidth) go(); else skip(); }
    }
  }

  private finishSlide(idx: number): void {
    const s = this.slots();
    if (!s[idx]) return;
    const updated = [...s];
    updated[idx] = {
      currentImg: updated[idx].nextImg,
      nextImg: updated[idx].nextImg,
      sliding: false,
      resetting: true,
    };
    this.slots.set(updated);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const s2 = this.slots();
        const u2 = [...s2];
        u2[idx] = { ...u2[idx], resetting: false };
        this.slots.set(u2);
      });
    });
  }

  private pickNextLogo(slotIdx: number): string {
    const total = this.partnersImages.length;
    const ptr = (this.slotPointers[slotIdx] + 1) % total;
    this.slotPointers[slotIdx] = ptr;
    return this.partnersImages[ptr];
  }
}
