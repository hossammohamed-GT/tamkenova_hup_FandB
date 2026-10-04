import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouteTransitionService } from './route-transition.service';

/**
 * Routes every internal link click through the spiral transition.
 * Listens in the capture phase so it can claim the click before the
 * router's own handlers; modifier clicks, new-tab targets, downloads,
 * external URLs and same-page anchors keep their native behavior.
 */
@Injectable({ providedIn: 'root' })
export class TransitionLinksService {
  private doc = inject(DOCUMENT);
  private router = inject(Router);
  private transition = inject(RouteTransitionService);
  private attached = false;

  init(): void {
    if (this.attached || typeof window === 'undefined') return;
    this.attached = true;
    this.doc.addEventListener('click', (e) => this.onCapture(e as MouseEvent), true);
  }

  private onCapture(e: MouseEvent): void {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const target = e.target as Element | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    const href = anchor.getAttribute('href') || '';
    if (!href.startsWith('/')) return;
    // Same-page fragment scroll: keep native behavior.
    const hashIdx = href.indexOf('#');
    if (hashIdx >= 0) {
      const pathOnly = href.slice(0, hashIdx);
      const currentPath = this.router.url.split('#')[0].split('?')[0];
      if (pathOnly === '' || pathOnly === currentPath) return;
    }
    if (!this.transition.shouldAnimate()) return;

    e.preventDefault();
    e.stopPropagation();

    const badge = anchor.querySelector('.service-arrow');
    badge?.classList.add('is-leaving');
    const box = (badge ?? anchor).getBoundingClientRect();
    let x = e.clientX;
    let y = e.clientY;
    if (x === 0 && y === 0) {
      x = box.left + box.width / 2;
      y = box.top + box.height / 2;
    }
    this.transition.go(x, y, href);
  }
}
