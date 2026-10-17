import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({ providedIn: 'root' })
export class StaffService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/students`;

  uploadAvatar(file: File): Observable<{ profile_image: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .patch<any>(`${this.baseUrl}/avatar`, formData)
      .pipe(map((res) => res?.data ?? res));
  }

  updateContactInfo(payload: { phone?: string; whatsapp?: string }): Observable<any> {
    return this.http
      .patch<any>(`${this.baseUrl}/contact-info`, payload)
      .pipe(map((res) => res?.data ?? res));
  }

  changePassword(payload: {
    current_password: string;
    new_password: string;
  }): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/change-password`, payload);
  }
}
