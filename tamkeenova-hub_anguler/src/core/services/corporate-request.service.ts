import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CorporateAttachment,
  CorporateRequest,
  CorporateStatus,
  CreateCorporateRequestPayload,
} from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class CorporateRequestService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/corporate-requests`;

  // -- Submit Corporate Request --
  create(
    payload: CreateCorporateRequestPayload,
  ): Observable<{ message: string; request: Partial<CorporateRequest> }> {
    return this.http.post<{ message: string; request: Partial<CorporateRequest> }>(
      this.baseUrl,
      payload,
    );
  }

  // -- Upload Attachment --
  uploadAttachment(
    id: string,
    file: File,
  ): Observable<{ message: string; attachment: CorporateAttachment }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ message: string; attachment: CorporateAttachment }>(
      `${this.baseUrl}/${id}/attachments`,
      formData,
    );
  }

  // -- My Corporate Requests --
  getMine(status?: CorporateStatus): Observable<{ data: CorporateRequest[]; total: number }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<{ data: CorporateRequest[]; total: number }>(this.baseUrl, { params });
  }

  // -- Corporate Request Details --
  getById(id: string): Observable<CorporateRequest> {
    return this.http.get<CorporateRequest>(`${this.baseUrl}/${id}`);
  }
}
