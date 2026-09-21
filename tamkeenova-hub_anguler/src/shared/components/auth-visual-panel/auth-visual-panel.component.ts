import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

interface PathNode {
  key: string;
  icon: string;
}

@Component({
  selector: 'app-auth-visual-panel',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './auth-visual-panel.component.html',
  styleUrl: './auth-visual-panel.component.css',
})
export class AuthVisualPanelComponent implements AfterViewInit {
  @Input() mode: 'login' | 'register' = 'login';

  @ViewChild('pathLine') private pathLineRef?: ElementRef<SVGPathElement>;

  readonly nodes: PathNode[] = [
    { key: 'learn', icon: 'fa-book-open' },
    { key: 'practice', icon: 'fa-laptop-code' },
    { key: 'certify', icon: 'fa-award' },
    { key: 'career', icon: 'fa-briefcase' },
  ];

  ngAfterViewInit(): void {
    const path = this.pathLineRef?.nativeElement;
    if (!path) return;

    const prefersReduced = (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);
    if (prefersReduced) return;

    // jsdom (and very old browsers) do not implement SVGGeometryElement.getTotalLength
    if (typeof path.getTotalLength !== 'function') return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    void path.getBoundingClientRect();

    requestAnimationFrame(() => {
      path.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.65, 0, 0.35, 1) 0.2s';
      path.style.strokeDashoffset = '0';
    });
  }
}
