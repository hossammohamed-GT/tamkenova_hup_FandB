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

  // -- Public Student Profile --
  getPublicProfile(username: string): Observable<PublicStudentProfile> {
    return this.http.get<PublicStudentProfile>(`${this.baseUrl}/students/u/${username}`);
  }

  // -- Verify Certificate --
  verifyCertificate(code: string): Observable<VerifyCertificateResponse> {
    return this.http.get<VerifyCertificateResponse>(
      `${this.baseUrl}/verify/certificate/${encodeURIComponent(code)}`,
    );
  }

  // -- Verify User (Full Profile) --
  verifyUser(username: string): Observable<VerifyUserResponse> {
    return this.http.get<VerifyUserResponse>(`${this.baseUrl}/verify/user/${username}`);
  }
}
