import { Component, OnInit, OnDestroy, HostListener, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { GalleryService } from '../../core/services/gallery.service';

export interface GalleryImage {
  src: string;
  alt?: string;
}

type LightboxSection = 'programs' | 'events' | null;

@Component({
  selector: 'app-gallery-showcase',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './gallery-showcase.component.html',
  styleUrl: './gallery-showcase.component.css',
})
export class GalleryShowcaseComponent implements OnInit, OnDestroy {
  private galleryService = inject(GalleryService);

  heroImages = signal<string[]>([]);
  programs = signal<GalleryImage[]>([]);
  events = signal<GalleryImage[]>([]);

  private readonly prefersReduced = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  loadedImages = signal<Set<string>>(new Set());
  imageAspect = signal<Map<string, number>>(new Map());

  marqueeRowTop = computed(() => this.buildMarqueeRow(0));
  marqueeRowBottom = computed(() => this.buildMarqueeRow(1));

  // -- Build a Repeating Marquee Row --
  private buildMarqueeRow(offset: 0 | 1): string[] {
    const all = this.heroImages();
    const row = all.filter((_, i) => i % 2 === offset);
    if (!row.length) return [];
    return [...row, ...row];
  }

  // -- Lightbox State --
  lightboxSection = signal<LightboxSection>(null);
  lightboxIndex = signal(0);
  originX = signal(50);
  originY = signal(50);
  imgVisible = signal(true);

  get isLightboxOpen(): boolean {
    return this.lightboxSection() !== null;
  }

  currentImage = computed<GalleryImage | null>(() => {
    const list = this.activeList();
    return list[this.lightboxIndex()] ?? null;
  });

  // -- Load Gallery Images --
  ngOnInit(): void {
    this.heroImages.set(this.galleryService.getHeroImages());
    this.programs.set(this.galleryService.getPrograms());
    this.events.set(this.galleryService.getEvents());
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  // -- Retrieve the Active Lightbox Image List --
  private activeList(): GalleryImage[] {
    const section = this.lightboxSection();
    if (section === 'programs') return this.programs();
    if (section === 'events') return this.events();
    return [];
  }

  // -- Record Image Dimensions and Load State --
  onImageLoad(event: Event, src: string): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      const updated = new Map(this.imageAspect());
      updated.set(src, img.naturalWidth / img.naturalHeight);
      this.imageAspect.set(updated);
    }
    const loaded = new Set(this.loadedImages());
    loaded.add(src);
    this.loadedImages.set(loaded);
  }

  isImageLoaded(src: string): boolean {
    return this.loadedImages().has(src);
  }

  getAspectRatio(src: string): number | null {
    return this.imageAspect().get(src) ?? null;
  }

  // -- Apply a Pointer-Based Tile Tilt Effect --
  onTileTilt(event: MouseEvent): void {
    if (this.prefersReduced) return;
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 8;
    const rotateX = (0.5 - py) * 8;
    el.style.setProperty('--tilt-x', `${rotateX}deg`);
    el.style.setProperty('--tilt-y', `${rotateY}deg`);
    el.style.setProperty('--glow-x', `${px * 100}%`);
    el.style.setProperty('--glow-y', `${py * 100}%`);
  }

  // -- Reset the Tile Tilt Effect --
  onTileTiltReset(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  }

  // -- Open the Image Lightbox --
  openLightbox(event: MouseEvent, section: 'programs' | 'events', index: number): void {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    this.originX.set(Math.round((event.clientX / vw) * 100));
    this.originY.set(Math.round((event.clientY / vh) * 100));
    this.lightboxSection.set(section);
    this.lightboxIndex.set(index);
    this.imgVisible.set(true);
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
  }

  // -- Close the Image Lightbox --
  closeLightbox(): void {
    this.lightboxSection.set(null);
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  lightboxNext(): void {
    this.navigate(1);
  }

  lightboxPrev(): void {
    this.navigate(-1);
  }

  // -- Navigate Between Lightbox Images --
  private navigate(dir: 1 | -1): void {
    const total = this.activeList().length;
    if (!total) return;

    this.imgVisible.set(false);
    setTimeout(() => {
      this.lightboxIndex.update((i) => (i + dir + total) % total);
      this.imgVisible.set(true);
    }, 180); 
  }

  @HostListener('document:keydown', ['$event'])
  // -- Handle Lightbox Keyboard Navigation --
  onKeydown(event: KeyboardEvent): void {
    if (!this.isLightboxOpen) return;
    if (event.key === 'Escape') this.closeLightbox();
    else if (event.key === 'ArrowRight') this.lightboxNext();
    else if (event.key === 'ArrowLeft') this.lightboxPrev();
  }
}
