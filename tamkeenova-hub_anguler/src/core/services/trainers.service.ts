import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Trainer } from '../models/trainer.model';
import { ApiDataResponse } from '../models/auth.model';

interface TrainersListResponse {
  success: boolean;
  count: number;
  data: Trainer[];
}

interface TrainerSingleResponse {
  success: boolean;
  data: Trainer;
}

@Injectable({ providedIn: 'root' })
export class TrainersService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/trainers`;

  getAll(): Observable<Trainer[]> {
    return this.http.get<TrainersListResponse>(this.baseUrl).pipe(map((res) => res.data ?? []));
  }

  getFeatured(limit = 8): Observable<Trainer[]> {
    return this.getAll().pipe(map((list) => list.slice(0, limit)));
  }

  getBySlug(slug: string): Observable<Trainer | null> {
    return this.http
      .get<TrainerSingleResponse>(`${this.baseUrl}/${slug}`)
      .pipe(map((res) => res.data ?? null));
  }

  getMyProfile(): Observable<Trainer | null> {
    return this.http
      .get<TrainerSingleResponse>(`${this.baseUrl}/me`)
      .pipe(map((res) => res.data ?? null));
  }

  getTrainerBySlug(slug: string) {
    return this.http.get<ApiDataResponse<Trainer>>(`${this.baseUrl}/profile/${slug}`);
  }
}
