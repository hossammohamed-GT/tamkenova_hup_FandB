import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface VolunteerStatusData {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string | null;
  total_hours?: number;
}

@Injectable({ providedIn: 'root' })
export class VolunteersService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/volunteers`;

  // Cached approval flag (avoids re-checking on every navigation)
  isApprovedCached = false;

  // -- Retrieve the Current Volunteer's Application Status --
  // Tries the documented shape, then a couple of common aliases.
  getMyStatus(): Observable<VolunteerStatusData> {
    return this.tryStatus(`${this.baseUrl}/me`).pipe(
      catchError((err) => {
        if (err?.status === 401) return throwError(() => err);
        return this.tryStatus(`${this.baseUrl}/application-status`);
      }),
      catchError((err) => {
        if (err?.status === 401) return throwError(() => err);
        return this.tryStatus(`${this.baseUrl}/my-status`);
      }),
    );
  }

  private tryStatus(url: string): Observable<VolunteerStatusData> {
    return this.http.get<any>(url).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return {
          status: (data?.status ?? data?.volunteer_status ?? 'PENDING') as VolunteerStatusData['status'],
          rejection_reason: data?.rejection_reason ?? null,
          total_hours: data?.total_hours,
        };
      }),
    );
  }

  // -- Suppress endpoint-missing noise for the caller --
  silent(): Observable<VolunteerStatusData | null> {
    return this.getMyStatus().pipe(catchError(() => of(null)));
  }
}
