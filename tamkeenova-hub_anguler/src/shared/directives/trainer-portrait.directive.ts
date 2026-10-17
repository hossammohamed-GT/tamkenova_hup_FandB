import { Directive, computed, input, signal } from '@angular/core';

export const DEFAULT_TRAINER_PORTRAIT = '/assets/trainers/default-portrait.svg';

/** A decorative, locally hosted illustration, never a fictional instructor photo. */
@Directive({
  selector: 'img[appTrainerPortrait]',
  standalone: true,
  host: {
    '[src]': 'imageSource()',
    '[class.is-default-portrait]': 'isDefault()',
    '(error)': 'useDefault()',
  },
})
export class TrainerPortraitDirective {
  readonly source = input<string | null | undefined>(null, { alias: 'appTrainerPortrait' });
  private readonly failedSource = signal<string | null>(null);
  private readonly normalizedSource = computed(() => this.source()?.trim() || null);
  readonly isDefault = computed(
    () => !this.normalizedSource() || this.failedSource() === this.normalizedSource(),
  );
  readonly imageSource = computed(() =>
    this.isDefault() ? DEFAULT_TRAINER_PORTRAIT : this.normalizedSource(),
  );

  useDefault(): void {
    // Do not loop if the local asset itself cannot be loaded. A new API image
    // can still render when a reused card receives updated instructor data.
    if (!this.isDefault()) this.failedSource.set(this.normalizedSource());
  }
}
