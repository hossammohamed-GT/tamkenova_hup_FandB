import {
  Directive,
  DoCheck,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  Renderer2,
  inject,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { FormFeedback } from './form-feedback';
let nextId = 0;
@Directive({ selector: '[appFormFeedback]', standalone: true })
export class FormFeedbackDirective implements DoCheck, OnDestroy {
  @Input({ required: true }) appFormFeedback!: FormFeedback;
  readonly fields = new Set<InlineErrorDirective>();
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private renderer = inject(Renderer2);
  private general?: HTMLElement;
  private revision = 0;
  private timer?: ReturnType<typeof setTimeout>;
  ngDoCheck() {
    const state = this.appFormFeedback;
    if (!state) return;
    const unknown = Object.entries(state.fields())
      .filter(([path]) => ![...this.fields].some((f) => f.path === path))
      .flatMap(([path, messages]) => messages.map((m) => `${path}: ${m}`));
    const text = [state.general(), ...unknown].filter(Boolean).join(' · ');
    if (text && !this.general) {
      this.general = this.renderer.createElement('p');
      this.renderer.setAttribute(this.general, 'role', 'alert');
      this.renderer.setAttribute(this.general, 'tabindex', '-1');
      this.renderer.addClass(this.general, 'form-feedback-error');
      this.renderer.appendChild(this.element, this.general);
    }
    if (this.general) {
      this.general.textContent = text;
      this.general.hidden = !text;
    }
    if (this.revision !== state.focusRevision()) {
      this.revision = state.focusRevision();
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        const first =
          this.element.querySelector<HTMLElement>('[aria-invalid="true"]') ||
          (text ? this.general : undefined);
        first?.focus();
        first?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      });
    }
  }
  ngOnDestroy() {
    clearTimeout(this.timer);
    this.general?.remove();
  }
}
@Directive({ selector: '[ngModel],[formControl],[formControlName],[fieldPath]', standalone: true })
export class InlineErrorDirective implements DoCheck, OnDestroy {
  @Input() fieldPath = '';
  private readonly control = inject(NgControl, { optional: true, self: true });
  private readonly form = inject(FormFeedbackDirective, { optional: true, skipSelf: true });
  private readonly lang = inject(TranslateService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private message?: HTMLElement;
  private readonly id = `field-error-${++nextId}`;
  get path() {
    return (
      this.fieldPath || this.control?.path?.join('.') || this.element.getAttribute('name') || ''
    );
  }
  constructor() {
    this.form?.fields.add(this);
  }
  @HostListener('input') @HostListener('change') changed() {
    this.form?.appFormFeedback?.clearField(this.path);
  }
  ngDoCheck() {
    if (this.path) this.renderer.setAttribute(this.element, 'data-field-path', this.path);
    const state = this.form?.appFormFeedback;
    if (!state) return;
    const c = this.control?.control;
    let messages = state.fields()[this.path] || [];
    if (!messages.length && c?.invalid && (c.touched || state.attempted())) {
      const en = this.lang.currentLang() === 'en',
        e = c.errors || {};
      const t = (ar: string, english: string) => (en ? english : ar);
      messages = [
        e['required']
          ? t('هذا الحقل مطلوب.', 'This field is required.')
          : e['minlength']
            ? t(
                `أدخل ${e['minlength'].requiredLength} أحرف على الأقل.`,
                `Enter at least ${e['minlength'].requiredLength} characters.`,
              )
            : e['maxlength']
              ? t(
                  `الحد الأقصى ${e['maxlength'].requiredLength} حرفًا.`,
                  `Use at most ${e['maxlength'].requiredLength} characters.`,
                )
              : e['min']
                ? t(`القيمة لا تقل عن ${e['min'].min}.`, `Value must be at least ${e['min'].min}.`)
                : e['max']
                  ? t(
                      `القيمة لا تزيد عن ${e['max'].max}.`,
                      `Value must be at most ${e['max'].max}.`,
                    )
                  : t('أدخل قيمة صحيحة لهذا الحقل.', 'Enter a valid value for this field.'),
      ];
    }
    const text = messages.join(' · ');
    if (text && !this.message) {
      this.message = this.renderer.createElement('small');
      this.renderer.setAttribute(this.message, 'id', this.id);
      this.renderer.setAttribute(this.message, 'role', 'alert');
      this.renderer.addClass(this.message, 'field-error');
      this.renderer.insertBefore(this.element.parentNode, this.message, this.element.nextSibling);
    }
    if (this.message) {
      this.message.textContent = text;
      this.message.hidden = !text;
    }
    if (text) {
      this.renderer.setAttribute(this.element, 'aria-invalid', 'true');
      const ids = (this.element.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(Boolean);
      if (!ids.includes(this.id))
        this.renderer.setAttribute(this.element, 'aria-describedby', [...ids, this.id].join(' '));
    } else this.removeAria();
  }
  private removeAria() {
    if (!this.message) return;
    this.renderer.removeAttribute(this.element, 'aria-invalid');
    const ids = (this.element.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== this.id);
    if (ids.length) this.renderer.setAttribute(this.element, 'aria-describedby', ids.join(' '));
    else this.renderer.removeAttribute(this.element, 'aria-describedby');
  }
  ngOnDestroy() {
    this.form?.fields.delete(this);
    this.removeAria();
    this.message?.remove();
  }
}
export const INLINE_ERRORS = [FormFeedbackDirective, InlineErrorDirective] as const;
