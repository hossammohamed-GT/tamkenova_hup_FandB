// -- Admin Module Models (mirrors Tamkeenova Admin API) --

import { TaskAssignee, Task } from './tasks.model';

export type ManagedRole = 'STUDENT' | 'TRAINER' | 'CLIENT' | 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN' | 'VOLUNTEER';
export type VolunteerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TrainerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type CertificateType = 'TRAINING' | 'VOLUNTEER' | 'OTHER';
export type CorporateAction =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  phone: string | null;
  role: ManagedRole;
  profile_image: string | null;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AdminUsersResponse {
  data: AdminUser[];
  meta?: PaginationMeta;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminTrainerCertificate {
  id: string;
  trainer_id: string;
  title: string | null;
  certificate_url: string;
  created_at: string;
}

export interface AdminTrainerDocument {
  id: string;
  trainer_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at?: string;
}

export interface AdminTrainer {
  id: string;
  user_id: string;
  trainer_status: TrainerStatus;
  bio_ar: string | null;
  bio_en: string | null;
  years_of_experience: number | null;
  consultation_price: string | null;
  is_available?: boolean;
  created_at: string;
  updated_at?: string;
  users?: AdminUser | null;
  specializations?: { id: string; name_ar: string; name_en: string } | null;
  trainer_certificates?: AdminTrainerCertificate[];
  trainer_documents?: AdminTrainerDocument[];
  rejection_reason?: string | null;
  _count?: { training_programs?: number; trainer_reviews?: number };
}

export interface AdminVolunteer {
  id: string;
  user_id: string;
  status: VolunteerStatus;
  volunteer_status?: VolunteerStatus;
  bio: string | null;
  total_hours: number;
  created_at: string;
  users?: AdminUser | null;
  rejection_reason?: string | null;
}

export interface AdminCertificate {
  id: string;
  user_id: string;
  trainer_id: string | null;
  program_id: string | null;
  title: string;
  description: string | null;
  training_hours: number | null;
  certificate_type: CertificateType | null;
  certificate_url: string | null;
  verification_code: string;
  qr_code_url: string | null;
  is_valid: boolean;
  issued_at: string;
  created_at: string;
  users?: Pick<AdminUser, 'id' | 'full_name' | 'email' | 'username' | 'profile_image'> | null;
  trainers?: { id: string; users?: { full_name: string } | null } | null;
  training_programs?: { id: string; title: string } | null;
}

export interface IssueCertificatePayload {
  user_id: string;
  title: string;
  description?: string;
  training_hours?: number;
  certificate_type?: CertificateType;
  trainer_id?: string;
  program_id?: string;
}

export interface AdminCorporateRequest {
  id: string;
  user_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  company_name: string;
  sector: string | null;
  country: string | null;
  employees_count: number | null;
  service_type: string;
  service_description: string;
  expected_budget: string | null;
  project_duration: string | null;
  status: CorporateAction;
  assigned_to: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  users?: Pick<AdminUser, 'id' | 'full_name' | 'email'> | null;
  assigned_employee?: Pick<AdminUser, 'id' | 'full_name' | 'email'> | null;
  corporate_request_attachments?: { id: string; file_url: string; file_name?: string | null }[];
}

export interface CorporateStatusPayload {
  action: CorporateAction;
  assigned_to?: string;
  admin_notes?: string;
  reason?: string;
}

export interface SpecializationSuggestion {
  id: string;
  user_id: string;
  name_ar: string;
  name_en: string;
  status?: string;
  created_at: string;
  users?: Pick<AdminUser, 'id' | 'full_name' | 'email'> | null;
}

export interface AdminProgram {
  id: string;
  title: string;
  description: string | null;
  price: string | number | null;
  duration_hours: number | null;
  level?: string | null;
  image_url: string | null;
  is_hidden?: boolean;
  is_published?: boolean;
  status?: string | null;
  average_rating?: string | number | null;
  created_at: string;
  trainers?: { id: string; users?: { full_name: string } | null } | null;
  specializations?: { id: string; name_ar: string; name_en: string } | null;
  _count?: { enrollments?: number; reviews?: number };
}

export interface AdminDashboardStats {
  users_count: number;
  students_count: number;
  trainers_count: number;
  pending_trainers_count: number;
  employees_count: number;
  volunteers_count: number;
  pending_volunteers_count: number;
  programs_count: number;
  consultations_count: number;
  corporate_requests_count: number;
  pending_corporate_requests_count: number;
  certificates_count: number;
  tasks_count: number;
}

export interface AdminTask extends Task {
  task_assignees?: (TaskAssignee & { users?: AdminUser | null })[];
}

export interface UpdateUserStatusPayload {
  is_active: boolean;
}
