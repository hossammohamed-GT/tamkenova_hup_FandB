import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiDataResponse, ApiSuccessMessage } from '../models/auth.model';
import {
  ApplicationStatusData,
  AvailabilityPayload,
  AvailabilitySlot,
  ProgramPayload,
  TrainerDashboardStats,
  TrainerProfile,
  TrainerProgram,
  TrainerReview,
  UpdateTrainerProfilePayload,
} from '../models/trainer-profile.model';

export interface ReviewSubmitResponse {
  success: boolean;
  message: string;
  updated?: boolean;
  data?: {
    review: unknown;
    average_rating: number;
    ratings_count: number;
  };
}

@Injectable({ providedIn: 'root' })
export class TrainerService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/trainers`;
  private approvedStatus = signal(false);
  get isApprovedCached(): boolean {
    return this.approvedStatus();
  }

  resetCache(): void {
    this.approvedStatus.set(false);
  }

  getApplicationStatus() {
    return this.http
      .get<ApiDataResponse<ApplicationStatusData>>(`${this.baseUrl}/application-status`)
      .pipe(
        tap((res) => {
          if (res.data.status === 'APPROVED') {
            this.approvedStatus.set(true);
          } else {
            this.approvedStatus.set(false);
          }
        }),
      );
  }

  getMyProfile() {
    return this.http.get<any>(`${this.baseUrl}/me`).pipe(
      map((res) => {
        return (res?.data ?? res) as TrainerProfile;
      }),
    );
  }

  updateMyProfile(payload: UpdateTrainerProfilePayload) {
    return this.http.patch<ApiSuccessMessage>(`${this.baseUrl}/me`, payload);
  }

  getPrograms() {
    return this.http.get<any>(`${this.baseUrl}/programs`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : (data?.data ?? []);
      }),
    );
  }

  createProgram(payload: ProgramPayload) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/programs`, payload);
  }

  updateProgram(id: string, payload: ProgramPayload) {
    return this.http.put<ApiSuccessMessage>(`${this.baseUrl}/programs/${id}`, payload);
  }

  deleteProgram(id: string) {
    return this.http.delete<ApiSuccessMessage>(`${this.baseUrl}/programs/${id}`);
  }

  getAvailability() {
    return this.http.get<any>(`${this.baseUrl}/availability`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : (data?.data ?? []);
      }),
    );
  }

  createAvailability(payload: AvailabilityPayload) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/availability`, payload);
  }

  updateAvailability(id: string, payload: Partial<AvailabilityPayload>) {
    return this.http.patch<ApiSuccessMessage>(`${this.baseUrl}/availability/${id}`, payload);
  }

  deleteAvailability(id: string) {
    return this.http.delete<ApiSuccessMessage>(`${this.baseUrl}/availability/${id}`);
  }

  getTrainerReviews(trainerId: string) {
    return this.http.get<any>(`${this.baseUrl}/${trainerId}/reviews`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : (data?.data ?? []);
      }),
    );
  }

  // Re-rating updates existing
  createReview(trainerId: string, payload: { rating: number; comment: string }) {
    return this.http.post<ReviewSubmitResponse>(`${this.baseUrl}/${trainerId}/reviews`, payload);
  }

  getDashboardStats() {
    return this.http.get<ApiDataResponse<TrainerDashboardStats>>(`${this.baseUrl}/dashboard`);
  }

  uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ success: boolean; profile_image: string }>(
      `${this.baseUrl}/upload-profile-image`,
      formData,
    );
  }
}
