import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Consultation,
  ConsultationStatus,
  CreateConsultationPayload,
  ReviewConsultationPayload,
} from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class ConsultationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/consultations`;

  create(payload: CreateConsultationPayload): Observable<{ message: string; consultation: Consultation }> {
    return this.http.post<{ message: string; consultation: Consultation }>(this.baseUrl, payload);
  }

  getMine(status?: ConsultationStatus): Observable<{ data: Consultation[]; total: number }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res) => {
        if (res?.data && Array.isArray(res.data)) return res;
        if (Array.isArray(res)) return { data: res, total: res.length };
        return { data: res?.data ?? [], total: res?.total ?? 0 };
      })
    );
  }

  getById(id: string): Observable<Consultation> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((res) => res?.data ?? res?.consultation ?? res)
    );
  }

  cancel(id: string): Observable<{ message: string; consultation: Consultation }> {
    return this.http.patch<{ message: string; consultation: Consultation }>(
      `${this.baseUrl}/${id}/cancel`,
      {},
    );
  }

  review(
    id: string,
    payload: ReviewConsultationPayload,
  ): Observable<{ message: string; review: { id: string; rating: number; comment: string | null } }> {
    return this.http.post<{
      message: string;
      review: { id: string; rating: number; comment: string | null };
    }>(`${this.baseUrl}/${id}/review`, payload);
  }
}
