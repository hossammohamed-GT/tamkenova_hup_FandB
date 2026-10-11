import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationsService } from './notifications.service';
import {
  ApiDataResponse,
  ApiSuccessMessage,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResendOtpRequest,
  User,
  UserRole,
  VerifyEmailRequest,
  VolunteerRegisterRequest,
  type RegisterResponse,
} from '../models/auth.model';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationsService = inject(NotificationsService);
  private baseUrl = `${environment.apiUrl}/auth`;

  private _currentUser = signal<User | null>(this.readUserFromStorage());
  currentUser = this._currentUser.asReadonly();

  isLoggedIn = computed(() => !!this._currentUser() && !!this.getToken());
  role = computed(() => this._currentUser()?.role ?? null);
  isTrainer = computed(() => this.role() === 'TRAINER');
  isStudent = computed(() => this.role() === 'STUDENT');
  isAdmin = computed(() => this.role() === 'ADMIN' || this.role() === 'SUPER_ADMIN');
  isEmployee = computed(() => this.role() === 'EMPLOYEE');
  isVolunteer = computed(() => this.role() === 'VOLUNTEER');
  isStaffMember = computed(() => this.isEmployee() || this.isVolunteer());

  register(payload: RegisterRequest) {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, payload);
  }

  registerVolunteer(payload: VolunteerRegisterRequest) {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register/volunteer`, payload);
  }

  checkAvailability(params: { email?: string; username?: string; phone?: string }) {
    return this.http.get<{ success: boolean; data: { email_available: boolean; username_available: boolean; phone_available: boolean } }>(`${this.baseUrl}/availability`, { params });
  }

  verifyEmail(payload: VerifyEmailRequest) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/verify-email`, payload);
  }

  resendOtp(payload: ResendOtpRequest) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/resend-otp`, payload);
  }

  login(payload: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload);
  }

  forgotPassword(payload: { email: string }) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/forgot-password`, payload);
  }

  resetPassword(payload: { email: string; otp: string; new_password: string; confirm_password: string }) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/reset-password`, payload);
  }

  setSession(response: LoginResponse): void {
    const { access_token, user } = response.data;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    } catch {}
    this._currentUser.set(user);
  }

  fetchCurrentUser() {
    return this.http.get<ApiDataResponse<User>>(`${this.baseUrl}/me`);
  }

  refreshCurrentUser(): void {
    this.fetchCurrentUser().subscribe({
      next: (res) => {
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(USER_KEY, JSON.stringify(res.data));
        } catch {}
        this._currentUser.set(res.data);
      },
      error: () => this.logout(),
    });
  }

  homeRouteForRole(role: UserRole | null): string {
    if (role === 'TRAINER') return '/portal/trainer';
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/portal/admin';
    if (role === 'EMPLOYEE') return '/portal/employee';
    if (role === 'VOLUNTEER') return '/portal/trainee';
    return '/portal/student';
  }

  private syncInFlight: Observable<{ changed: boolean; role: UserRole | null }> | null = null;

  syncSession(): Observable<{ changed: boolean; role: UserRole | null }> {
    if (this.syncInFlight) return this.syncInFlight;
    const previous = this._currentUser()?.role ?? null;
    this.syncInFlight = this.fetchCurrentUser().pipe(
      map((res) => {
        const fresh = res.data;
        const changed = !!previous && fresh.role !== previous;
        try {
          if (typeof localStorage !== 'undefined')
            localStorage.setItem(USER_KEY, JSON.stringify(fresh));
        } catch {}
        this._currentUser.set(fresh);
        return { changed, role: fresh.role };
      }),
      catchError((err) => {
        // Logout on 401 only
        if (err?.status === 401) {
          this.logout(false);
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      }),
      finalize(() => {
        this.syncInFlight = null;
      }),
      shareReplay(1),
    );
    return this.syncInFlight;
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private readUserFromStorage(): User | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {}
      return null;
    }
  }

  logout(redirect = true): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    } catch {}
    this._currentUser.set(null);
    this.notificationsService.reset();
    if (redirect) this.router.navigate(['/login']);
  }

  private pendingEmail = signal<string | null>(this.readPendingEmail());

  setPendingEmail(email: string): void {
    this.pendingEmail.set(email);
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pending_email', email);
    } catch {}
  }

  getPendingEmail(): string | null {
    return this.pendingEmail() ?? this.readPendingEmail();
  }

  private readPendingEmail(): string | null {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      return sessionStorage.getItem('pending_email');
    } catch {
      return null;
    }
  }
}
