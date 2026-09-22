import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// NOTE: these endpoints live under /students/* but operate on the generic
// users row (JwtAuthGuard only, no role check) — safe for employee/volunteer.
@Injectable({ providedIn: 'root' })
export class StaffService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/students`;

  // -- Upload the staff member's avatar --
  uploadAvatar(file: File): Observable<{ profile_image: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .patch<any>(`${this.baseUrl}/avatar`, formData)
      .pipe(map((res) => res?.data ?? res));
  }

  // -- Update the staff member's contact info --
  updateContactInfo(payload: { phone?: string; whatsapp?: string }): Observable<any> {
    return this.http
      .patch<any>(`${this.baseUrl}/contact-info`, payload)
      .pipe(map((res) => res?.data ?? res));
  }

  // -- Change the staff member's password --
  changePassword(payload: {
    current_password: string;
    new_password: string;
  }): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/change-password`, payload);
  }
}
