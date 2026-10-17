import { Component, computed, inject, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Trainer } from '../../../core/models/trainer.model';
import { TrainerRatingComponent } from '../trainer-rating/trainer-rating.component';
import { SavedTrainersService } from '../../../core/services/saved-trainers.service';
import { trainerVisual } from './trainer-visual';
import { TrainerPortraitDirective } from '../../directives/trainer-portrait.directive';

@Component({
  selector: 'app-trainer-card',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    DecimalPipe,
    TrainerRatingComponent,
    TrainerPortraitDirective,
  ],
  templateUrl: './trainer-card.component.html',
  styleUrl: './trainer-card.component.css',
})
export class TrainerCardComponent {
  readonly trainer = input.required<Trainer>();
  readonly index = input(0);
  readonly interactiveRating = input(true);
  readonly book = output<Trainer>();
  readonly rated = output<{ trainerId: string; rating: number }>();
  readonly saved = inject(SavedTrainersService);
  private readonly translate = inject(TranslateService);
  readonly english = computed(() => this.translate.currentLang() === 'en');
  readonly name = computed(() => this.trainer().users?.full_name || '');
  readonly avatar = computed(() => this.trainer().users?.profile_image || null);
  readonly specialization = computed(() =>
    this.english()
      ? this.trainer().specializations?.name_en || this.trainer().specializations?.name_ar
      : this.trainer().specializations?.name_ar || this.trainer().specializations?.name_en,
  );
  readonly bio = computed(() =>
    this.english()
      ? this.trainer().bio_en || this.trainer().bio_ar
      : this.trainer().bio_ar || this.trainer().bio_en,
  );
  readonly rating = computed(() => Number(this.trainer().average_rating) || 0);
  readonly visual = computed(() =>
    trainerVisual(
      this.trainer().specializations?.name_en || this.trainer().specialization_id || '',
      this.index(),
    ),
  );
}
