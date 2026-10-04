import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChatService } from '../../../core/services/chat.service';

type AssistantState = 'closed' | 'flying' | 'open' | 'closing';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.css'
})
export class AiAssistantComponent implements AfterViewInit, OnDestroy {
  chat = inject(ChatService);
  private translate = inject(TranslateService);

  @ViewChild('shell') private shellRef?: ElementRef<HTMLDivElement>;
  @ViewChild('triggerMark') private markRef?: ElementRef<HTMLImageElement>;
  @ViewChild('messagesList') private messagesList?: ElementRef<HTMLDivElement>;
  @ViewChild('input') private inputRef?: ElementRef<HTMLTextAreaElement>;

  state = signal<AssistantState>('closed');
  draft = '';
  readonly comingSoon = true;

  private readonly FLY_MS = 260;
  private readonly CLOSE_MS = 200;
  private rafId?: number;

  constructor() {
    this.translate.get('assistant.welcome').subscribe((text) => this.chat.setWelcomeMessage(text));
    this.translate.onLangChange.subscribe(() => {
      this.translate.get('assistant.welcome').subscribe((text) => this.chat.setWelcomeMessage(text));
    });

    effect(() => {
      this.chat.messages();
      this.chat.isTyping();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  // -- Initialize the Closed Assistant Position --
  ngAfterViewInit(): void {
    this.applyBox(this.shellRef?.nativeElement, this.closedBox());
  }

  // -- Release Active Animation Resources --
  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  // -- Open the Assistant from Its Trigger --
  onTriggerClick(): void {
    if (this.state() !== 'closed') return;
    this.launch();
  }

  // -- Close the Assistant Panel --
  onClose(): void {
    if (this.state() !== 'open') return;
    this.chat.close();
    this.retract();
  }

  onBackdropClick(): void {
    this.onClose();
  }

  // -- Submit the Current Chat Draft --
  onSend(): void {
    if (this.comingSoon) return;
    const text = this.draft;
    this.draft = '';
    this.autoResize();
    this.chat.send(text);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  // -- Resize the Message Field to Its Content --
  autoResize(): void {
    const el = this.inputRef?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }
  // -- Calculate the Closed Assistant Bounds --
  private closedBox(): Box {
    const ih = typeof window !== 'undefined' ? window.innerHeight : 800;
    return { x: 24, y: ih - 24 - 60, w: 60, h: 60, r: 30 };
  }

  // -- Calculate the Open Assistant Bounds --
  private openBox(): Box {
    const iw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const ih = typeof window !== 'undefined' ? window.innerHeight : 800;
    const w = Math.min(420, iw - 48);
    const h = Math.min(640, ih - 48);
    return { x: (iw - w) / 2, y: (ih - h) / 2, w, h, r: 24 };
  }

  // -- Apply Bounds to the Assistant Shell --
  private applyBox(el: HTMLDivElement | undefined, box: Box): void {
    if (!el) return;
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.w}px`;
    el.style.height = `${box.h}px`;
    el.style.borderRadius = `${box.r}px`;
  }

  private resetMark(): void {
    const mark = this.markRef?.nativeElement;
    if (!mark) return;
    mark.style.transition = '';
    mark.style.opacity = '1';
    mark.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';
  }




  // -- Animate the Assistant into Its Open State --
  private launch(): void {
    const shell = this.shellRef?.nativeElement;
    const mark = this.markRef?.nativeElement;
    if (!shell) {
      this.state.set('open');
      this.chat.open();
      return;
    }

    const prefersReduced = (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);
    const start = this.closedBox();
    const end = this.openBox();

    if (prefersReduced) {
      this.applyBox(shell, end);
      this.state.set('open');
      this.chat.open();
      setTimeout(() => this.inputRef?.nativeElement.focus(), 50);
      return;
    }


    const startCx = start.x + start.w / 2;
    const startCy = start.y + start.h / 2;
    const endCx = end.x + end.w / 2;
    const endCy = end.y + end.h / 2;
    const midX = (startCx + endCx) / 2 + (Math.random() - 0.5) * 40;
    const midY = Math.min(startCy, endCy) - 40;

    this.state.set('flying');
    if (mark) mark.style.transition = '';

    const startTime = performance.now();

    const tick = (now: number) => {
      const rawT = Math.min(1, (now - startTime) / this.FLY_MS);
      const t = this.easeInOutCubic(rawT);

      const cx = this.quadBezier(startCx, midX, endCx, t);
      const cy = this.quadBezier(startCy, midY, endCy, t);
      const w = this.lerp(start.w, end.w, t);
      const h = this.lerp(start.h, end.h, t);
      const r = this.lerp(start.r, end.r, t);

      shell.style.left = `${cx - w / 2}px`;
      shell.style.top = `${cy - h / 2}px`;
      shell.style.width = `${w}px`;
      shell.style.height = `${h}px`;
      shell.style.borderRadius = `${r}px`;

      if (mark) {
        const spin = t * 90;
        const scale = 1 + t * 0.1;
        const fadeStart = 0.55;
        const opacity = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / 0.3);
        mark.style.opacity = `${opacity}`;
        mark.style.transform = `translate(-50%, -50%) rotate(${spin}deg) scale(${scale})`;
      }

      if (rawT < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.state.set('open');
        this.chat.open();
        setTimeout(() => this.inputRef?.nativeElement.focus(), 80);
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }
  // -- Animate the Assistant into Its Closed State --
  private retract(): void {
    const shell = this.shellRef?.nativeElement;
    const mark = this.markRef?.nativeElement;
    if (!shell) {
      this.state.set('closed');
      return;
    }

    this.state.set('closing');
    const box = this.closedBox();
    const ease = 'cubic-bezier(0.65, 0, 0.35, 1)';

    shell.style.transition = [
      `left ${this.CLOSE_MS}ms ${ease}`,
      `top ${this.CLOSE_MS}ms ${ease}`,
      `width ${this.CLOSE_MS}ms ${ease}`,
      `height ${this.CLOSE_MS}ms ${ease}`,
      `border-radius ${this.CLOSE_MS}ms ${ease}`
    ].join(', ');

    this.applyBox(shell, box);

    if (mark) {
      mark.style.opacity = '0';
      mark.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(0.5)';
      mark.style.transition = `opacity ${this.CLOSE_MS}ms ease ${this.CLOSE_MS * 0.5}ms, transform ${this.CLOSE_MS}ms ease ${this.CLOSE_MS * 0.5}ms`;
      setTimeout(() => {
        if (mark) {
          mark.style.opacity = '1';
          mark.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';
        }
      }, 20);
    }

    setTimeout(() => {
      shell.style.transition = '';
      this.state.set('closed');
    }, this.CLOSE_MS);
  }
  // -- Interpolate a Numeric Value --
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private quadBezier(p0: number, p1: number, p2: number, t: number): number {
    const inv = 1 - t;
    return inv * inv * p0 + 2 * inv * t * p1 + t * t * p2;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private scrollToBottom(): void {
    const el = this.messagesList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
