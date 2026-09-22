import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
} from '@angular/core';

/** Keyboard containment and focus restoration for the certificate editor. */
@Directive({ selector: '[certificateDialog]', standalone: true })
export class CertificateDialogDirective implements AfterViewInit, OnDestroy {
  private element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private previousFocus = document.activeElement as HTMLElement | null;
  private previousOverflow = document.body.style.overflow;
  ngAfterViewInit(): void {
    document.body.style.overflow = 'hidden';
    this.focusable()[0]?.focus({ preventScroll: true });
  }
  private focusable(): HTMLElement[] {
    return [
      ...this.element.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href], [tabindex="0"]',
      ),
    ].filter((el) => !el.matches(':disabled') && el.getClientRects().length > 0);
  }
  @HostListener('keydown', ['$event']) onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = this.focusable();
    const first = items[0],
      last = items.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  ngOnDestroy(): void {
    document.body.style.overflow = this.previousOverflow;
    this.previousFocus?.focus({ preventScroll: true });
  }
}
