export type UserRole = 'STUDENT' | 'TRAINER' | 'CLIENT' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN' | 'VOLUNTEER';

export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  profile_image: string | null;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  username?: string;
  // -- Trainer Registration Fields --
  specialization_id?: string;
  bio_ar?: string;
  bio_en?: string;
  description_ar?: string;
  description_en?: string;
  cover_letter?: string;
  linkedin_url?: string;
  facebook_url?: string;
  website_url?: string;
  portfolio_url?: string;
  consultation_price_from?: number;
  consultation_price_to?: number;
  consultation_duration?: number;
  certificate_urls?: string[];
  documents?: { file_name: string; file_url: string; file_type: string }[];
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user_id?: string;
}

export interface VolunteerRegisterRequest {
  full_name: string;
  username?: string;
  email: string;
  phone: string;
  password: string;
  bio?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  access_token: string;
  user: User;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginResponseData;
}

export interface ApiSuccessMessage {
  success: boolean;
  message: string;
}

export interface ApiDataResponse<T> {
  success: boolean;
  data: T;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
}
