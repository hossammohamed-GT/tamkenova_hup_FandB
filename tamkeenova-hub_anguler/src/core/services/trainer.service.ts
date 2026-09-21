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

  // -- Retrieve the Current Trainer Profile -- يدعم {data} و مباشر
  getMyProfile() {
    return this.http.get<any>(`${this.baseUrl}/me`).pipe(
      map((res) => {
        // لو { success, data: profile } أو { data: profile } أو مباشرة profile
        return (res?.data ?? res) as TrainerProfile;
      }),
    );
  }

  // -- Update the Current Trainer Profile --
  updateMyProfile(payload: UpdateTrainerProfilePayload) {
    return this.http.patch<ApiSuccessMessage>(`${this.baseUrl}/me`, payload);
  }

  // -- Retrieve Trainer Programs -- يدعم wrapper
  getPrograms() {
    return this.http.get<any>(`${this.baseUrl}/programs`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : (data?.data ?? []);
      }),
    );
  }

  // -- Create a Trainer Program --
  createProgram(payload: ProgramPayload) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/programs`, payload);
  }

  // -- Update a Trainer Program --
  updateProgram(id: string, payload: ProgramPayload) {
    return this.http.put<ApiSuccessMessage>(`${this.baseUrl}/programs/${id}`, payload);
  }

  // -- Delete a Trainer Program --
  deleteProgram(id: string) {
    return this.http.delete<ApiSuccessMessage>(`${this.baseUrl}/programs/${id}`);
  }

  // -- Retrieve Availability Slots -- يدعم wrapper
  getAvailability() {
    return this.http.get<any>(`${this.baseUrl}/availability`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : (data?.data ?? []);
      }),
    );
  }

  // -- Create an Availability Slot --
  createAvailability(payload: AvailabilityPayload) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/availability`, payload);
  }

  // -- Update an Availability Slot --
  updateAvailability(id: string, payload: Partial<AvailabilityPayload>) {
    return this.http.patch<ApiSuccessMessage>(`${this.baseUrl}/availability/${id}`, payload);
  }

  // -- Delete an Availability Slot --
  deleteAvailability(id: string) {
    return this.http.delete<ApiSuccessMessage>(`${this.baseUrl}/availability/${id}`);
  }

  // -- Retrieve Trainer Reviews -- يدعم wrapper
  getTrainerReviews(trainerId: string) {
    return this.http.get<any>(`${this.baseUrl}/${trainerId}/reviews`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : (data?.data ?? []);
      }),
    );
  }

  // -- Submit a Trainer Review --
  createReview(trainerId: string, payload: { rating: number; comment: string }) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/${trainerId}/reviews`, payload);
  }

  // -- Retrieve Trainer Dashboard Statistics --
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
