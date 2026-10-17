import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

interface RatingStatus {
  trainer_id: string;
  rating: number;
}
interface RatingResult {
  data: { review: { rating: number }; average_rating: number; ratings_count: number };
}
@Injectable({ providedIn: 'root' })
export class TrainerRatingsService {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/trainers`;
  readonly state = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly mine = signal<RatingStatus[]>([]);
  readonly aggregates = signal<Record<string, { average_rating: number; ratings_count: number }>>(
    {},
  );
  readonly eligible = computed(() => this.auth.isLoggedIn() && this.auth.isStudent());
  private readonly refresh = signal(0);
  constructor() {
    effect((onCleanup) => {
      const user = this.auth.currentUser()?.id;
      const eligible = this.eligible();
      this.refresh();
      this.mine.set([]);
      this.aggregates.set({});
      if (!user || !eligible) {
        this.state.set('idle');
        return;
      }
      this.state.set('loading');
      const request = this.http
        .get<{ data: RatingStatus[] }>(`${this.url}/reviews/mine`)
        .subscribe({
          next: (res) => {
            this.mine.set(Array.isArray(res.data) ? res.data : []);
            this.state.set('ready');
          },
          error: () => this.state.set('error'),
        });
      onCleanup(() => request.unsubscribe());
    });
  }
  retry() {
    this.refresh.update((value) => value + 1);
  }
  previous(id: string) {
    return this.mine().find((review) => review.trainer_id === id);
  }
  submit(id: string, rating: number) {
    const userId = this.auth.currentUser()?.id;
    return this.http.post<RatingResult>(`${this.url}/${id}/reviews`, { rating, comment: '' }).pipe(
      tap((res) => {
        if (this.auth.currentUser()?.id !== userId) return;
        this.mine.update((rows) => [
          ...rows.filter((row) => row.trainer_id !== id),
          { trainer_id: id, rating },
        ]);
        this.aggregates.update((values) => ({
          ...values,
          [id]: {
            average_rating: Number(res.data.average_rating),
            ratings_count: res.data.ratings_count,
          },
        }));
      }),
      catchError((error) => {
        if (error.status === 409 && this.auth.currentUser()?.id === userId) {
          this.mine.update((rows) => [
            ...rows.filter((row) => row.trainer_id !== id),
            { trainer_id: id, rating: 0 },
          ]);
        }
        return throwError(() => error);
      }),
    );
  }
}
