import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideTranslateService } from '@ngx-translate/core';
import { FormFeedback } from './form-feedback';
import { INLINE_ERRORS } from './inline-errors.directive';
@Component({
  standalone: true,
  imports: [FormsModule, ...INLINE_ERRORS],
  template: ` <form [appFormFeedback]="left">
      <label
        >Title<input
          name="title_en"
          [(ngModel)]="title"
          required
          aria-describedby="title-help" /></label
      ><span id="title-help">Help</span>
    </form>
    <form [appFormFeedback]="right">
      <label>Other title<input name="title_en" [(ngModel)]="other" required /></label>
    </form>`,
})
class Host {
  left = new FormFeedback();
  right = new FormFeedback();
  title = 'Valid title';
  other = 'Other title';
}
describe('Scoped inline field feedback', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideTranslateService({ lang: 'en' })],
    }),
  );
  it('scopes identical field names to the correct form and preserves preexisting descriptions', async () => {
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    await f.whenStable();
    f.componentInstance.left.fail({ error: { field_errors: { title_en: ['Invalid title'] } } });
    f.detectChanges();
    const inputs = f.nativeElement.querySelectorAll('input');
    expect(inputs[0].getAttribute('aria-invalid')).toBe('true');
    expect(inputs[0].getAttribute('aria-describedby')).toMatch(/^title-help field-error-/);
    expect(inputs[1].hasAttribute('aria-invalid')).toBe(false);
    expect(f.nativeElement.querySelectorAll('small:not([hidden])').length).toBe(1);
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    f.detectChanges();
    expect(inputs[0].hasAttribute('aria-invalid')).toBe(false);
    expect(inputs[0].getAttribute('aria-describedby')).toBe('title-help');
    f.destroy();
  });
  it('renders unknown errors inside the relevant action without hiding them', async () => {
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    await f.whenStable();
    f.componentInstance.right.fail({
      error: { field_errors: { unknown_field: ['New server requirement'] } },
    });
    f.detectChanges();
    const forms = f.nativeElement.querySelectorAll('form');
    expect(forms[0].querySelector('.form-feedback-error')).toBeNull();
    expect(forms[1].querySelector('.form-feedback-error').textContent).toContain(
      'New server requirement',
    );
    f.destroy();
  });
});
