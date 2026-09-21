import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Specialization } from '../models/specialization.model';
import {
  ActivityLog,
  AdminCertificate,
  AdminCorporateRequest,
  AdminDashboardStats,
  AdminProgram,
  AdminTrainer,
  AdminUser,
  AdminUsersResponse,
  AdminVolunteer,
  CorporateAction,
  CorporateStatusPayload,
  IssueCertificatePayload,
  ManagedRole,
  SpecializationSuggestion,
} from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin`;

  private unwrap<T>(obs: Observable<any>) {
    return obs.pipe(map((res) => (res?.data !== undefined ? res.data : res))) as Observable<T>;
  }

  // ==================== Users ====================

  getUsers(query: {
    search?: string;
    role?: ManagedRole | 'ALL';
    is_active?: boolean | 'ALL';
    page?: number;
    limit?: number;
  } = {}): Observable<AdminUsersResponse> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.role && query.role !== 'ALL') params = params.set('role', query.role);
    if (query.is_active !== undefined && query.is_active !== 'ALL')
      params = params.set('is_active', String(query.is_active));
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    return this.http.get<AdminUsersResponse>(`${this.baseUrl}/users`, { params });
  }

  getUser(id: string): Observable<AdminUser> {
    return this.unwrap<AdminUser>(this.http.get<any>(`${this.baseUrl}/users/${id}`));
  }

  changeUserRole(id: string, role: ManagedRole): Observable<AdminUser> {
    return this.unwrap<AdminUser>(this.http.patch<any>(`${this.baseUrl}/users/${id}/role`, { role }));
  }

  changeUserStatus(id: string, is_active: boolean): Observable<AdminUser> {
    return this.unwrap<AdminUser>(this.http.patch<any>(`${this.baseUrl}/users/${id}/status`, { is_active }));
  }

  getUserActivity(id: string): Observable<ActivityLog[]> {
    return this.unwrap<any>(this.http.get<any>(`${this.baseUrl}/users/${id}/activity`)).pipe(
      map((res) => (Array.isArray(res) ? res : (res?.data ?? res?.logs ?? []))),
    );
  }

  // ==================== Trainers ====================

  getTrainers(status?: string): Observable<AdminTrainer[]> {
    let params = new HttpParams();
    if (status && status !== 'ALL') params = params.set('status', status);
    return this.unwrap<any>(this.http.get<any>(`${this.baseUrl}/trainers`, { params })).pipe(
      map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
    );
  }

  getTrainer(id: string): Observable<AdminTrainer> {
    return this.unwrap<AdminTrainer>(this.http.get<any>(`${this.baseUrl}/trainers/${id}`));
  }

  approveTrainer(id: string): Observable<AdminTrainer> {
    return this.unwrap<AdminTrainer>(this.http.patch<any>(`${this.baseUrl}/trainers/${id}/approve`, {}));
  }

  rejectTrainer(id: string, reason?: string): Observable<AdminTrainer> {
    return this.unwrap<AdminTrainer>(this.http.patch<any>(`${this.baseUrl}/trainers/${id}/reject`, { reason }));
  }

  suspendTrainer(id: string): Observable<AdminTrainer> {
    return this.unwrap<AdminTrainer>(this.http.patch<any>(`${this.baseUrl}/trainers/${id}/suspend`, {}));
  }

  activateTrainer(id: string): Observable<AdminTrainer> {
    return this.unwrap<AdminTrainer>(this.http.patch<any>(`${this.baseUrl}/trainers/${id}/activate`, {}));
  }

  // -- Update Trainer Data (Admin) --
  updateTrainer(id: string, payload: { years_of_experience?: number; bio_ar?: string; bio_en?: string }): Observable<AdminTrainer> {
    return this.unwrap<AdminTrainer>(this.http.patch<any>(`${this.baseUrl}/trainers/${id}`, payload));
  }

  addTrainerCertificate(id: string, payload: { title: string; certificate_url: string }): Observable<AdminTrainer> {
    return this.unwrap<AdminTrainer>(this.http.post<any>(`${this.baseUrl}/trainers/${id}/certificates`, payload));
  }

  deleteTrainerCertificate(certificateId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/trainers/certificates/${certificateId}`);
  }

  addTrainerDocument(id: string, payload: { file_name: string; file_url: string; file_type: string }): Observable<AdminTrainer> {
    return this.unwrap<AdminTrainer>(this.http.post<any>(`${this.baseUrl}/trainers/${id}/documents`, payload));
  }

  deleteTrainerDocument(documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/trainers/documents/${documentId}`);
  }

  // ==================== Volunteers ====================

  getVolunteers(status?: string): Observable<AdminVolunteer[]> {
    let params = new HttpParams();
    if (status && status !== 'ALL') params = params.set('status', status);
    return this.unwrap<any>(this.http.get<any>(`${this.baseUrl}/volunteers`, { params })).pipe(
      map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
    );
  }

  getVolunteer(id: string): Observable<AdminVolunteer> {
    return this.unwrap<AdminVolunteer>(this.http.get<any>(`${this.baseUrl}/volunteers/${id}`));
  }

  approveVolunteer(id: string): Observable<AdminVolunteer> {
    return this.unwrap<AdminVolunteer>(this.http.patch<any>(`${this.baseUrl}/volunteers/${id}/approve`, {}));
  }

  rejectVolunteer(id: string, reason?: string): Observable<AdminVolunteer> {
    return this.unwrap<AdminVolunteer>(this.http.patch<any>(`${this.baseUrl}/volunteers/${id}/reject`, { reason }));
  }

  // ==================== Certificates ====================

  getCertificates(): Observable<AdminCertificate[]> {
    return this.unwrap<any>(this.http.get<any>(`${this.baseUrl}/certificates`)).pipe(
      map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
    );
  }

  issueCertificate(payload: IssueCertificatePayload): Observable<AdminCertificate> {
    return this.unwrap<AdminCertificate>(this.http.post<any>(`${this.baseUrl}/certificates`, payload));
  }

  uploadCertificatePdf(id: string, file: File): Observable<AdminCertificate> {
    const fd = new FormData();
    fd.append('file', file);
    return this.unwrap<AdminCertificate>(this.http.post<any>(`${this.baseUrl}/certificates/${id}/pdf`, fd));
  }

  updateCertificate(id: string, payload: Partial<IssueCertificatePayload> & { is_valid?: boolean }): Observable<AdminCertificate> {
    return this.unwrap<AdminCertificate>(this.http.patch<any>(`${this.baseUrl}/certificates/${id}`, payload));
  }

  revokeCertificate(id: string): Observable<AdminCertificate> {
    return this.unwrap<AdminCertificate>(this.http.patch<any>(`${this.baseUrl}/certificates/${id}/revoke`, {}));
  }

  deleteCertificate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/certificates/${id}`);
  }

  // ==================== Corporate Requests ====================

  getCorporateRequests(status?: CorporateAction | 'ALL'): Observable<AdminCorporateRequest[]> {
    let params = new HttpParams();
    if (status && status !== 'ALL') params = params.set('status', status);
    return this.unwrap<any>(this.http.get<any>(`${this.baseUrl}/corporate-requests`, { params })).pipe(
      map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
    );
  }

  getCorporateRequest(id: string): Observable<AdminCorporateRequest> {
    return this.unwrap<AdminCorporateRequest>(this.http.get<any>(`${this.baseUrl}/corporate-requests/${id}`));
  }

  updateCorporateRequestStatus(id: string, payload: CorporateStatusPayload): Observable<AdminCorporateRequest> {
    return this.unwrap<AdminCorporateRequest>(
      this.http.patch<any>(`${this.baseUrl}/corporate-requests/${id}/status`, payload),
    );
  }

  // ==================== Specializations ====================

  getSpecializationRequests(): Observable<SpecializationSuggestion[]> {
    return this.unwrap<any>(this.http.get<any>(`${this.baseUrl}/specializations/requests`)).pipe(
      map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
    );
  }

  approveSpecializationRequest(id: string): Observable<SpecializationSuggestion> {
    return this.unwrap<SpecializationSuggestion>(
      this.http.patch<any>(`${this.baseUrl}/specializations/requests/${id}/approve`, {}),
    );
  }

  rejectSpecializationRequest(id: string): Observable<SpecializationSuggestion> {
    return this.unwrap<SpecializationSuggestion>(
      this.http.patch<any>(`${this.baseUrl}/specializations/requests/${id}/reject`, {}),
    );
  }

  createSpecialization(payload: { name_ar: string; name_en: string }): Observable<Specialization> {
    return this.unwrap<Specialization>(this.http.post<any>(`${this.baseUrl}/specializations`, payload));
  }

  updateSpecialization(id: string, payload: { name_ar: string; name_en: string }): Observable<Specialization> {
    return this.unwrap<Specialization>(this.http.patch<any>(`${this.baseUrl}/specializations/${id}`, payload));
  }

  deleteSpecialization(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/specializations/${id}`);
  }

  // ==================== Programs ====================

  getPrograms(): Observable<AdminProgram[]> {
    return this.unwrap<any>(this.http.get<any>(`${this.baseUrl}/programs`)).pipe(
      map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
    );
  }

  updateProgram(id: string, payload: Partial<Pick<AdminProgram, 'title' | 'description' | 'price' | 'duration_hours'>>): Observable<AdminProgram> {
    return this.unwrap<AdminProgram>(this.http.patch<any>(`${this.baseUrl}/programs/${id}`, payload));
  }

  hideProgram(id: string): Observable<AdminProgram> {
    return this.unwrap<AdminProgram>(this.http.patch<any>(`${this.baseUrl}/programs/${id}/hide`, {}));
  }

  showProgram(id: string): Observable<AdminProgram> {
    return this.unwrap<AdminProgram>(this.http.patch<any>(`${this.baseUrl}/programs/${id}/show`, {}));
  }

  deleteProgram(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/programs/${id}`);
  }

  // ==================== Dashboard ====================

  getDashboard(): Observable<AdminDashboardStats> {
    return this.unwrap<AdminDashboardStats>(this.http.get<any>(`${this.baseUrl}/dashboard`));
  }
}
