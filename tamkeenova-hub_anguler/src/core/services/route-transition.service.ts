import { Injectable, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, take } from 'rxjs';

export type TransitionPhase = 'idle' | 'expand' | 'hold' | 'collapse';

/**
 * Fullscreen circular route transition: a brand-colored circle blooms from
 * the clicked element to the viewport center, expands to cover the screen,
 * the router navigates underneath, then the circle shrinks back to the
 * center revealing the new page.
 */
@Injectable({ providedIn: 'root' })
export class RouteTransitionService {
  private router = inject(Router);

  readonly phase = signal<TransitionPhase>('idle');
  readonly origin = signal({ x: 0, y: 0 });

  private readonly EXPAND_MS = 650;
  private readonly REVEAL_DELAY_MS = 120;
  private readonly COLLAPSE_MS = 550;

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
        this.reveal();
        return;
      }
      settled$.subscribe(() => this.reveal());
      void this.router.navigateByUrl(url);
    }, this.EXPAND_MS);
  }

  private reveal(): void {
    // Let the new view paint under the cover, then shrink back to center.
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.phase.set('collapse');
        setTimeout(() => {
          this.phase.set('idle');
          this.busy = false;
        }, this.COLLAPSE_MS);
      }, this.REVEAL_DELAY_MS);
    });
  }
}
