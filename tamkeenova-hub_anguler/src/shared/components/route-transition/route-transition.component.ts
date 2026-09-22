import { Component, effect, inject, signal } from '@angular/core';
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
  readonly origin = this.transition.origin;
  readonly grown = signal(false);

  constructor() {
    // Let the dot paint at the origin first, then fly + expand on next frames.
    effect(() => {
      if (this.phase() === 'expand') {
        this.grown.set(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (this.phase() === 'expand') this.grown.set(true);
          });
        });
      }
      if (this.phase() === 'idle') this.grown.set(false);
      if (this.phase() === 'collapse') this.grown.set(false);
    });
  }
}
