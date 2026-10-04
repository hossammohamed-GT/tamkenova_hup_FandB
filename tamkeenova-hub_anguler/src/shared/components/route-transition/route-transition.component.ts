import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { RouteTransitionService } from '../../../core/services/route-transition.service';

@Component({
  selector: 'app-route-transition',
  standalone: true,
  templateUrl: './route-transition.component.html',
  styleUrl: './route-transition.component.css',
})
export class RouteTransitionComponent {
  private transition = inject(RouteTransitionService);

  readonly phase = this.transition.phase;

  private svg = viewChild<ElementRef<SVGSVGElement>>('spiralSvg');
  private path = viewChild<ElementRef<SVGPathElement>>('spiralPath');
  private rafId?: number;

  private readonly COVER_MS = 1200;
  private readonly REVEAL_MS = 1000;
  private readonly SPIN_DEG = 220;
  private readonly THIN_W = 0.35;
  private readonly THICK_W = 20;

  constructor() {
    effect(() => {
      const ph = this.phase();
      if (ph === 'expand') this.play(0, 1, this.COVER_MS);
      else if (ph === 'collapse') this.play(1, 0, this.REVEAL_MS);
      else if (ph === 'idle') this.stop();
    });
  }

  private play(from: number, to: number, ms: number): void {
    this.stop();
    // The @if block may not have rendered yet — wait a few frames for refs.
    let attempts = 0;
    const wait = () => {
      const pathEl = this.path()?.nativeElement;
      const svgEl = this.svg()?.nativeElement;
      if (!pathEl || !svgEl || typeof performance === 'undefined') {
        if (++attempts < 10 && typeof requestAnimationFrame !== 'undefined') {
          this.rafId = requestAnimationFrame(wait);
        }
        return;
      }
      this.run(pathEl, svgEl, from, to, ms);
    };
    wait();
  }

  private run(pathEl: SVGPathElement, svgEl: SVGSVGElement, from: number, to: number, ms: number): void {
    const t0 = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(1, (now - t0) / ms);
      const p = from + (to - from) * this.easeInOutCubic(raw);

      // Draw the spiral from the center outward during the first 75%.
      const draw = this.clamp01(p / 0.75);
      pathEl.style.strokeDasharray = '100 100';
      pathEl.style.strokeDashoffset = `${100 * (1 - draw)}`;

      // Thicken the line until the coils merge into full coverage.
      const thick = this.clamp01((p - 0.45) / 0.55);
      const w = this.THIN_W + (this.THICK_W - this.THIN_W) * thick * thick;
      pathEl.style.strokeWidth = `${w}`;

      // Slow majestic spin + gentle fade at the very start.
      svgEl.style.transform = `translate(-50%, -50%) rotate(${this.SPIN_DEG * p}deg)`;
      svgEl.style.opacity = `${this.clamp01(p / 0.08)}`;

      if (raw < 1) {
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = undefined;
  }

  private clamp01(v: number): number {
    return Math.min(1, Math.max(0, v));
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
