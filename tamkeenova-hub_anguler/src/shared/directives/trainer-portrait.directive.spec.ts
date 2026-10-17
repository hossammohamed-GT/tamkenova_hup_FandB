import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_TRAINER_PORTRAIT, TrainerPortraitDirective } from './trainer-portrait.directive';

@Component({
  imports: [TrainerPortraitDirective],
  template: '<img [appTrainerPortrait]="source()" alt="" />',
})
class PortraitHost {
  readonly source = signal<string | null | undefined>(null);
}

describe('Local default instructor illustration', () => {
  function create(source?: string | null) {
    const fixture = TestBed.createComponent(PortraitHost);
    fixture.componentInstance.source.set(source);
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    return { fixture, image };
  }

  for (const missing of [undefined, null, '', '   ']) {
    it(`uses a local, decorative illustration for ${JSON.stringify(missing)}`, () => {
      const { image } = create(missing);
      expect(image.getAttribute('src')).toBe(DEFAULT_TRAINER_PORTRAIT);
      expect(image.classList.contains('is-default-portrait')).toBe(true);
      expect(image.alt).toBe('');
    });
  }
  it('keeps a real API photo until it fails and then replaces it without an error loop', () => {
    const { fixture, image } = create('/real/instructor.webp');
    expect(image.getAttribute('src')).toBe('/real/instructor.webp');
    expect(image.classList.contains('is-default-portrait')).toBe(false);
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe(DEFAULT_TRAINER_PORTRAIT);
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe(DEFAULT_TRAINER_PORTRAIT);
  });
  it('renders an updated real photo when a reused card previously had a broken image', () => {
    const { fixture, image } = create('/broken.webp');
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    fixture.componentInstance.source.set('/updated.webp');
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe('/updated.webp');
    expect(image.classList.contains('is-default-portrait')).toBe(false);
    fixture.componentInstance.source.set(null);
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe(DEFAULT_TRAINER_PORTRAIT);
  });
});
