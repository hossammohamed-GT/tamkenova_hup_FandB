import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ChangePasswordPayload,
  ContactInfo,
  EnrollResponse,
  Enrollment,
  EnrollmentStatus,
  PaginatedResponse,
  ProgramsQuery,
  StudentCertificate,
  StudentProgramDetails,
  StudentProgramListItem,
  StudentProfile,
  StudentReview,
  TrainerListItem,
  TrainersQuery,
  UpdateContactInfoPayload,
  UpdateStudentProfilePayload,
} from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/students`;

  // -- Profile & Account -- يدعم wrapper
  getProfile(): Observable<StudentProfile> {
    return this.http.get<any>(`${this.baseUrl}/profile`).pipe(
      map((res) => res?.data ?? res)
    );
  }

  updateProfile(payload: UpdateStudentProfilePayload): Observable<StudentProfile> {
    return this.http.patch<any>(`${this.baseUrl}/profile`, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  uploadAvatar(file: File): Observable<StudentProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch<any>(`${this.baseUrl}/avatar`, formData).pipe(
      map((res) => res?.data ?? res)
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/change-password`, payload);
  }

  getContactInfo(): Observable<ContactInfo> {
    return this.http.get<any>(`${this.baseUrl}/contact-info`).pipe(
      map((res) => res?.data ?? res)
    );
  }

  updateContactInfo(payload: UpdateContactInfoPayload): Observable<ContactInfo> {
    return this.http.patch<any>(`${this.baseUrl}/contact-info`, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  // -- Trainer Browse --
  getTrainers(query: TrainersQuery = {}): Observable<PaginatedResponse<TrainerListItem>> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.specialization_id) params = params.set('specialization_id', query.specialization_id);
    if (query.min_rating !== undefined && query.min_rating !== null)
      params = params.set('min_rating', String(query.min_rating));
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    return this.http.get<PaginatedResponse<TrainerListItem>>(`${this.baseUrl}/trainers`, {
      params,
    });
  }

  // -- Training Programs --
  getPrograms(query: ProgramsQuery = {}): Observable<PaginatedResponse<StudentProgramListItem>> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.level) params = params.set('level', query.level);
    if (query.trainer_id) params = params.set('trainer_id', query.trainer_id);
    if (query.min_price !== undefined && query.min_price !== null)
      params = params.set('min_price', String(query.min_price));
    if (query.max_price !== undefined && query.max_price !== null)
      params = params.set('max_price', String(query.max_price));
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    return this.http.get<PaginatedResponse<StudentProgramListItem>>(`${this.baseUrl}/programs`, {
      params,
    });
  }

  getProgramDetails(id: string): Observable<StudentProgramDetails> {
    return this.http.get<any>(`${this.baseUrl}/programs/${id}`).pipe(
      map((res) => res?.data ?? res)
    );
  }

  // -- Enrollments --
  enroll(programId: string): Observable<EnrollResponse> {
    return this.http.post<EnrollResponse>(`${this.baseUrl}/enrollments`, {
      program_id: programId,
    });
  }

  getEnrollments(status?: EnrollmentStatus): Observable<{ data: Enrollment[]; total: number }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<{ data: Enrollment[]; total: number }>(`${this.baseUrl}/enrollments`, {
      params,
    });
  }

  getEnrollmentDetails(id: string): Observable<Enrollment> {
    return this.http.get<any>(`${this.baseUrl}/enrollments/${id}`).pipe(
      map((res) => res?.data ?? res)
    );
  }

  cancelEnrollment(id: string): Observable<{ message: string; enrollment: Enrollment }> {
    return this.http.patch<{ message: string; enrollment: Enrollment }>(
      `${this.baseUrl}/enrollments/${id}/cancel`,
      {},
    );
  }

  // -- Certificates --
  getCertificates(): Observable<{ data: StudentCertificate[]; total: number }> {
    return this.http.get<{ data: StudentCertificate[]; total: number }>(
      `${this.baseUrl}/certificates`,
    );
  }

  // -- Reviews --
  getMyReviews(): Observable<{ data: StudentReview[]; total: number }> {
    return this.http.get<{ data: StudentReview[]; total: number }>(`${this.baseUrl}/reviews`);
  }

  updateReview(
    id: string,
    payload: { rating?: number; comment?: string },
  ): Observable<{ message: string; review: StudentReview }> {
    return this.http.patch<{ message: string; review: StudentReview }>(
      `${this.baseUrl}/reviews/${id}`,
      payload,
    );
  }

  deleteReview(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/reviews/${id}`);
  }
}
