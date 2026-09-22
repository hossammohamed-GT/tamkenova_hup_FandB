import { Injectable, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, take } from 'rxjs';

export type TransitionPhase = 'idle' | 'expand' | 'hold' | 'collapse';

/**
 * Spiral route transition: a brand-colored spiral draws itself from the
 * center while spinning, its line thickening until the coils merge into
 * full coverage; the router navigates underneath, then the spiral unwinds
 * the same way revealing the new page.
 */
@Injectable({ providedIn: 'root' })
export class RouteTransitionService {
  private router = inject(Router);

  readonly phase = signal<TransitionPhase>('idle');
  readonly origin = signal({ x: 0, y: 0 });

  private readonly EXPAND_MS = 1250;
  private readonly REVEAL_DELAY_MS = 120;
  private readonly COLLAPSE_MS = 1200;

  private busy = false;

  shouldAnimate(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  go(x: number, y: number, url: string): void {
    if (this.busy) return;
    if (!this.shouldAnimate()) {
      void this.router.navigateByUrl(url);
      return;
    }
    this.busy = true;
    this.origin.set({ x, y });
    this.phase.set('expand');

    const settled$ = this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
      take(1),
    );

    setTimeout(() => {
      this.phase.set('hold');
      if (this.router.url === url) {
        this.reveal(false);
        return;
      }
      settled$.subscribe((e) => this.reveal(e instanceof NavigationEnd));
      void this.router.navigateByUrl(url);
    }, this.EXPAND_MS);
  }

  private reveal(navigated: boolean): void {
    // Let the new view paint under the cover, then unwind the spiral while
    // the new page glides in from the right beneath it.
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.phase.set('collapse');
        this.setEnterClass(navigated);
        setTimeout(() => {
          this.setEnterClass(false);
          this.phase.set('idle');
          this.busy = false;
        }, this.COLLAPSE_MS);
      }, this.REVEAL_DELAY_MS);
    });
  }

  private setEnterClass(on: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('route-enter', on);
  }
}
