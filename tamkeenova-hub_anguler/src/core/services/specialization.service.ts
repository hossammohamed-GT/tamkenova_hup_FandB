import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  Specialization,
  SpecializationRequestPayload,
  SpecializationRequestResponse,
} from '../models/specialization.model';

@Injectable({ providedIn: 'root' })
export class SpecializationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/specializations`;

  getAll() {
    return this.http.get<Specialization[]>(this.baseUrl);
  }

  getById(id: string) {
    return this.http.get<Specialization>(`${this.baseUrl}/${id}`);
  }

  requestNew(payload: SpecializationRequestPayload) {
    return this.http.post<SpecializationRequestResponse>(`${this.baseUrl}/request`, payload);
  }
}
