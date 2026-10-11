import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PublicStudentProfile,
  VerifyCertificateResponse,
  VerifyUserResponse,
} from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class VerificationService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getPublicProfile(username: string): Observable<PublicStudentProfile> {
    return this.http.get<PublicStudentProfile>(`${this.baseUrl}/students/u/${username}`);
  }

  verifyCertificate(code: string): Observable<VerifyCertificateResponse> {
    return this.http.get<VerifyCertificateResponse>(
      `${this.baseUrl}/verify/certificate/${encodeURIComponent(code)}`,
    );
  }

  verifyUser(username: string): Observable<VerifyUserResponse> {
    return this.http.get<VerifyUserResponse>(`${this.baseUrl}/verify/user/${username}`);
  }
}
