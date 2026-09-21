import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LoaderService } from '../../../core/services/loader.service';

interface WordmarkLetter {
  char: string;
  accent: boolean;
}

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './app-loader.component.html',
  styleUrl: './app-loader.component.css'
})
export class AppLoaderComponent implements AfterViewInit, OnDestroy {
  loader = inject(LoaderService);

  @ViewChild('root') private rootRef?: ElementRef<HTMLDivElement>;
  @ViewChild('gatePath') private gatePathRef?: ElementRef<SVGPathElement>;
  @ViewChild('tPath') private tPathRef?: ElementRef<SVGPathElement>;

  readonly wordmarkLetters: WordmarkLetter[] = [
    ...'Tamkee'.split('').map((char) => ({ char, accent: false })),
    ...'Nova'.split('').map((char) => ({ char, accent: true }))
  ];

  private timers: ReturnType<typeof setTimeout>[] = [];
  private hasMounted = false;

  constructor() {
    
    effect(() => {
      const visible = this.loader.isVisible();
      if (!this.hasMounted) return; 
      if (visible) this.playIntro();
      else this.playLeave();
    });
  }

  ngAfterViewInit(): void {
    this.hasMounted = true;
    if (this.loader.isVisible()) {
      this.playIntro();
    } else {
      this.rootRef?.nativeElement.classList.add('is-hidden');
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private playIntro(): void {
    const root = this.rootRef?.nativeElement;
    const gate = this.gatePathRef?.nativeElement;
    const t = this.tPathRef?.nativeElement;
    if (!root || !gate || !t) return;

    this.clearTimers();

    root.classList.remove('is-hidden', 'is-leaving', 'is-filled', 'is-revealing', 'is-loading');
    gate.classList.remove('is-drawing');
    t.classList.remove('is-drawing');

    const prefersReduced = (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);
    if (prefersReduced) {
      root.classList.add('is-filled', 'is-revealing', 'is-loading');
      return;
    }

    // jsdom (and very old browsers) do not implement SVGGeometryElement.getTotalLength
    if (typeof gate.getTotalLength !== 'function' || typeof t.getTotalLength !== 'function') {
      root.classList.add('is-filled', 'is-revealing', 'is-loading');
      return;
    }

    const gateLength = gate.getTotalLength();
    const tLength = t.getTotalLength();
    gate.style.strokeDasharray = `${gateLength}`;
    gate.style.strokeDashoffset = `${gateLength}`;
    t.style.strokeDasharray = `${tLength}`;
    t.style.strokeDashoffset = `${tLength}`;

    void root.offsetWidth;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.schedule(() => {
          gate.classList.add('is-drawing');
          gate.style.strokeDashoffset = '0';
        }, 150);

        this.schedule(() => {
          t.classList.add('is-drawing');
          t.style.strokeDashoffset = '0';
        }, 420);

        this.schedule(() => root.classList.add('is-filled'), 1450);
        this.schedule(() => root.classList.add('is-revealing'), 1600);
        this.schedule(() => root.classList.add('is-loading'), 2200);
      });
    });
  }


  private playLeave(): void {
    const root = this.rootRef?.nativeElement;
    if (!root) return;

    this.clearTimers();
    root.classList.remove('is-loading');
    root.classList.add('is-leaving');

    this.schedule(() => {
      root.classList.add('is-hidden');
      root.classList.remove('is-leaving');
    }, 500);
  }

  private schedule(fn: () => void, delay: number): void {
    this.timers.push(setTimeout(fn, delay));
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}