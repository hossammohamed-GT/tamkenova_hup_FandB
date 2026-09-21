import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppNotification, NotificationsResponse } from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/notifications`;

  unreadCount = signal(0);

  // -- Get All Notifications --
  getAll(): Observable<NotificationsResponse> {
    return this.http
      .get<NotificationsResponse>(this.baseUrl)
      .pipe(tap((res) => this.unreadCount.set(res.unread_count ?? 0)));
  }

  // -- Refresh Unread Count --
  refreshUnreadCount(): void {
    this.http.get<{ unread_count: number }>(`${this.baseUrl}/unread-count`).subscribe({
      next: (res) => this.unreadCount.set(res.unread_count ?? 0),
      error: () => undefined,
    });
  }

  // -- Mark as Read --
  markAsRead(id: string): Observable<AppNotification> {
    return this.http
      .patch<AppNotification>(`${this.baseUrl}/${id}/read`, {})
      .pipe(tap(() => this.unreadCount.update((c) => Math.max(0, c - 1))));
  }

  // -- Mark All as Read --
  markAllAsRead(): Observable<{ message: string; updated_count: number }> {
    return this.http
      .patch<{ message: string; updated_count: number }>(`${this.baseUrl}/read-all`, {})
      .pipe(tap(() => this.unreadCount.set(0)));
  }

  // -- Reset Counter (on logout) --
  reset(): void {
    this.unreadCount.set(0);
  }
}
