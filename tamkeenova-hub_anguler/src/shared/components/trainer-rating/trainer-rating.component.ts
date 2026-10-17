import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TrainerRatingsService } from '../../../core/services/trainer-ratings.service';

let nextId = 0;
@Component({
  selector: 'app-trainer-rating',
  standalone: true,
  imports: [DecimalPipe, RouterLink, TranslatePipe],
  template: ` <div
    class="rating-zone"
    (mouseenter)="open.set(true)"
    (mouseleave)="leave($event)"
    (focusout)="onBlur($event)"
  >
    <button
      type="button"
      class="rating-trigger"
      #trigger
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="id"
      [attr.aria-label]="
        (previous() ? 'student_trainers.already_rated' : 'team_ui.rate_trainer') | translate
      "
      [title]="(previous() ? 'student_trainers.already_rated' : 'team_ui.rate_trainer') | translate"
      (focus)="open.set(true)"
      (click)="open.set(true)"
      (keydown.escape)="close(true)"
    >
      <span class="gold-star" aria-hidden="true">★</span
      ><span
        ><strong>{{ average() | number: '1.1-1' }}</strong
        ><small>({{ count() }})</small></span
      >
      @if (previous()) {
        <span class="rated-check" aria-hidden="true">✓</span>
      }
    </button>
    @if (open()) {
      <div class="rating-popover" [id]="id" (keydown.escape)="close(true)">
        @if (!ratings.auth.isLoggedIn()) {
          <p>{{ 'student_trainers.login_to_rate' | translate }}</p>
          <a routerLink="/login">{{ 'nav.login' | translate }} →</a>
        } @else if (!ratings.eligible()) {
          <p>{{ 'student_trainers.only_students' | translate }}</p>
        } @else if (ratings.state() === 'loading') {
          <p role="status">{{ 'team_ui.checking_rating' | translate }}</p>
        } @else if (ratings.state() === 'error') {
          <p>{{ 'team_ui.rating_load_error' | translate }}</p>
          <button type="button" (click)="ratings.retry()">
            {{ 'programs.catalog.try_again' | translate }}
          </button>
        } @else if (previous(); as review) {
          <p class="already-rated" role="status">
            <span aria-hidden="true">✓</span> {{ 'student_trainers.already_rated' | translate }}
          </p>
          @if (review.rating > 0) {
            <div class="saved-stars" [attr.aria-label]="review.rating + ' / 5'">
              @for (star of stars; track star) {
                <span [class.filled]="star <= review.rating">★</span>
              }
            </div>
          }
        } @else {
          <p>{{ 'team_ui.choose_rating' | translate }}</p>
          <div
            class="rating-stars"
            role="group"
            [attr.aria-label]="'team_ui.rate_trainer' | translate"
            (mouseleave)="hover.set(0)"
          >
            @for (star of stars; track star) {
              <button
                type="button"
                class="rating-star-btn"
                [class.filled]="star <= hover()"
                [disabled]="ratings.state() !== 'ready'"
                [attr.aria-disabled]="busy()"
                [attr.aria-label]="'team_ui.rate_stars' | translate: { count: star }"
                (mouseenter)="hover.set(star)"
                (focus)="hover.set(star)"
                (click)="submit(star)"
              >
                ★
              </button>
            }
          </div>
        }
        @if (busy()) {
          <p role="status">{{ 'team_ui.saving' | translate }}</p>
        }
        @if (error()) {
          <p class="rating-error" role="alert">{{ 'team_ui.rating_failed' | translate }}</p>
        }
      </div>
    }
  </div>`,
  styleUrl: './trainer-rating.component.css',
})
export class TrainerRatingComponent {
  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;
  readonly ratings = inject(TrainerRatingsService);
  private readonly destroyRef = inject(DestroyRef);
  trainerId = input.required<string>();
  rating = input<number>(0);
  ratingsCount = input<number>(0);
  readonly id = `trainer-rating-${++nextId}`;
  readonly open = signal(false);
  readonly hover = signal(0);
  readonly busy = signal(false);
  readonly error = signal(false);
  readonly stars = [1, 2, 3, 4, 5];
  readonly previous = computed(() => this.ratings.previous(this.trainerId()));
  readonly average = computed(
    () => this.ratings.aggregates()[this.trainerId()]?.average_rating ?? this.rating(),
  );
  readonly count = computed(
    () => this.ratings.aggregates()[this.trainerId()]?.ratings_count ?? this.ratingsCount(),
  );
  constructor() {
    effect(() => {
      this.trainerId();
      this.ratings.auth.currentUser()?.id;
      this.error.set(false);
      this.open.set(false);
      this.hover.set(0);
    });
  }
  close(restoreFocus = false) {
    if (restoreFocus) this.trigger?.nativeElement.focus({ preventScroll: true });
    this.open.set(false);
    this.hover.set(0);
  }
  leave(event: MouseEvent) {
    if (!(event.currentTarget as HTMLElement).contains(document.activeElement)) this.close();
  }
  onBlur(event: FocusEvent) {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) this.close();
  }
  private finish() {
    // Keep focus on a persistent control before the five-star picker becomes
    // the read-only confirmation. Disabling/removing the focused star must not
    // dismiss the confirmation or send keyboard focus back to the document.
    if (this.open()) this.trigger?.nativeElement.focus({ preventScroll: true });
    this.busy.set(false);
  }
  submit(star: number) {
    if (
      this.busy() ||
      this.previous() ||
      !this.ratings.eligible() ||
      this.ratings.state() !== 'ready'
    )
      return;
    this.busy.set(true);
    this.error.set(false);
    this.ratings
      .submit(this.trainerId(), star)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finish(),
        error: (err) => {
          this.finish();
          this.error.set(err.status !== 409);
        },
      });
  }
}
