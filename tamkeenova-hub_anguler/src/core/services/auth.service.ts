import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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

  // -- Register a New User --
  register(payload: RegisterRequest) {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, payload);
  }

  // -- Submit a Volunteer Application (public) --
  registerVolunteer(payload: VolunteerRegisterRequest) {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register/volunteer`, payload);
  }

  // -- Verify an Email Address --
  verifyEmail(payload: VerifyEmailRequest) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/verify-email`, payload);
  }

  // -- Resend an Email Verification Code --
  resendOtp(payload: ResendOtpRequest) {
    return this.http.post<ApiSuccessMessage>(`${this.baseUrl}/resend-otp`, payload);
  }

  // -- Authenticate a User --
  login(payload: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload);
  }

  // -- Persist the Authenticated User Session --
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

  // -- Retrieve the Authenticated User --
  fetchCurrentUser() {
    return this.http.get<ApiDataResponse<User>>(`${this.baseUrl}/me`);
  }

  // -- Refresh the Stored User Profile --
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

  // -- Retrieve the Stored Access Token --
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  // -- Restore a Valid User from Local Storage --
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

  // -- Clear the Current User Session --
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

  private pendingEmail = signal<string | null>(null);
  // -- Store the Email Awaiting Verification --
  setPendingEmail(email: string): void {
    this.pendingEmail.set(email);
  }
  // -- Retrieve the Email Awaiting Verification --
  getPendingEmail(): string | null {
    return this.pendingEmail();
  }
}
