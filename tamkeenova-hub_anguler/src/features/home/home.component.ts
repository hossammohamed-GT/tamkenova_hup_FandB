import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
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
  heroImages = [
    '/images/hero/hero1.jpg',
    '/images/hero/hero2.jpg',
    '/images/hero/hero3.jpg',
    '/images/hero/hero4.jpg',
    '/images/hero/hero5.jpg',
    '/images/hero/hero6.jpg',
    '/images/hero/hero7.jpg',
  ];
  activeHeroIndex = signal(0);
  private heroTimer?: ReturnType<typeof setInterval>;

  galleryImages: string[] = [
    '/images/events/hero1.jpg',
    '/images/events/hero2.jpg',
    '/images/events/hero3.jpg',
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

  partnersImages: string[] = [
    '/images/partners/partners1.png',
    '/images/partners/partners2.png',
    '/images/partners/partners3.png',
    '/images/partners/partners4.png',
    '/images/partners/partners5.png',
  ];

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

    this.initPartnersWave();
  }

  ngOnDestroy(): void {
    if (this.heroTimer) clearInterval(this.heroTimer);
    this.partnerTimers.forEach((t) => clearTimeout(t));
  }

  private initPartnersWave(): void {
    const initial = this.partnersImages.slice(0, this.slotsCount);
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
    const waveDuration = (this.slotsCount - 1) * this.staggerMs + this.slideDurationMs;
    const totalDelay = waveDuration + this.wavePauseMs;

    const t = setTimeout(() => {
      this.runWave();
      this.scheduleNextWave();
    }, totalDelay);
    this.partnerTimers.push(t);
  }

  private runWave(): void {
    for (let i = 0; i < this.slotsCount; i++) {
      const t = setTimeout(() => this.startSlide(i), i * this.staggerMs);
      this.partnerTimers.push(t);
    }
  }

  private startSlide(idx: number): void {
    const current = this.slots();
    const nextImg = this.pickNextLogo(idx);

    const updated = [...current];
    updated[idx] = { ...updated[idx], nextImg, sliding: true };
    this.slots.set(updated);

    const t = setTimeout(() => this.finishSlide(idx), this.slideDurationMs);
    this.partnerTimers.push(t);
  }

  private finishSlide(idx: number): void {
    const s = this.slots();
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
