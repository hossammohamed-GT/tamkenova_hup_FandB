import { Component, computed, input } from '@angular/core';

type StarState = 'full' | 'half' | 'empty';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.css',
})
export class StarRatingComponent {
  rating = input.required<number>();

  stars = computed<StarState[]>(() => {
    const r = this.rating();
    return Array.from({ length: 5 }, (_, i) => {
      const diff = r - i;
      if (diff >= 1) return 'full';
      if (diff >= 0.5) return 'half';
      return 'empty';
    });
  });
}