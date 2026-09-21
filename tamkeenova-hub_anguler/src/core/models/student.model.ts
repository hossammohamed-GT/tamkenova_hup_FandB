// -- Student Module Models (mirrors Tamkeenova Student API) --

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'SUSPENDED';
export type ConsultationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED';
export type CorporateStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';
export type ContactMethod = 'whatsapp' | 'phone' | 'email';

export interface StudentSkill {
  name: string;
  source: string;
}

export interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  username: string | null;
  profile_image: string | null;
  bio: string | null;
  location: string | null;
  whatsapp: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  total_training_hours: number;
  role: string;
  created_at: string;
  completed_programs_count: number;
  certificates_count: number;
  skills: StudentSkill[];
}

export interface UpdateStudentProfilePayload {
  full_name?: string;
  bio?: string;
  location?: string;
  username?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ContactInfo {
  id: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  website_url: string | null;
  linkedin_url: string | null;
}

export interface UpdateContactInfoPayload {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website_url?: string;
  linkedin_url?: string;
}

export interface TrainerListItemUser {
  full_name: string;
  profile_image: string | null;
}

export interface TrainerListItem {
  id: string;
  slug: string;
  bio_ar: string | null;
  bio_en: string | null;
  years_of_experience: number;
  consultation_price: string | null;
  average_rating: string | null;
  ratings_count: number;
  total_students: number;
  users: TrainerListItemUser;
  specializations: { id: string; name_ar: string; name_en: string } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
  total?: number;
}

export interface TrainersQuery {
  search?: string;
  specialization_id?: string;
  min_rating?: number;
  page?: number;
  limit?: number;
}

export interface StudentProgramListItem {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  short_description: string | null;
  price: string;
  discount_price: string | null;
  duration_hours: number | null;
  level: string;
  enrolled_count: number;
  trainers: {
    id: string;
    slug: string;
    users: TrainerListItemUser;
  } | null;
}

export interface StudentProgramDetails extends StudentProgramListItem {
  description: string | null;
  is_active: boolean;
  trainers: {
    id: string;
    slug: string;
    average_rating: string | null;
    users: TrainerListItemUser;
    specializations: { id: string; name_ar: string; name_en: string } | null;
  } | null;
}

export interface ProgramsQuery {
  search?: string;
  level?: string;
  trainer_id?: string;
  min_price?: number;
  max_price?: number;
  page?: number;
  limit?: number;
}

export interface Enrollment {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  progress: number;
  trainer_notes: string | null;
  training_programs: {
    id: string;
    title: string;
    slug: string;
    image_url: string | null;
    price: string;
    discount_price: string | null;
    duration_hours: number | null;
    level: string;
    description?: string | null;
    trainers: {
      id: string;
      slug: string;
      users: TrainerListItemUser;
    } | null;
  };
}

export interface EnrollResponse {
  message: string;
  enrollment: Enrollment;
}

export interface StudentCertificate {
  id: string;
  verification_code: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
  qr_code_url: string | null;
  issued_at: string;
  is_valid: boolean;
  training_hours: number | null;
  training_programs: { id: string; title: string; slug: string } | null;
  trainers: { id: string; slug: string; users: { full_name: string } } | null;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  total: number;
  unread_count: number;
}

export interface Consultation {
  id: string;
  title: string;
  description: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: ConsultationStatus;
  price: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  trainer_notes: string | null;
  student_notes: string | null;
  contact_phone: string | null;
  preferred_contact_method: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at?: string;
  student_id?: string;
  trainer_id?: string;
  trainers?: {
    id: string;
    slug: string;
    consultation_price?: string | null;
    users: TrainerListItemUser & { email?: string };
    specializations?: { id: string; name_ar: string; name_en: string } | null;
  } | null;
  users?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    profile_image: string | null;
    bio?: string | null;
    whatsapp?: string | null;
  } | null;
}

export interface CreateConsultationPayload {
  trainer_id: string;
  title: string;
  description: string;
  preferred_date?: string;
  preferred_time?: string;
  contact_phone?: string;
  preferred_contact_method?: ContactMethod;
  student_notes?: string;
}

export interface ReviewConsultationPayload {
  rating: number;
  comment?: string;
}

export interface CorporateAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export interface CorporateRequest {
  id: string;
  requester_id?: string;
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
  status: CorporateStatus;
  admin_notes: string | null;
  assigned_to?: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  corporate_request_attachments: CorporateAttachment[];
}

export interface CreateCorporateRequestPayload {
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  contact_whatsapp?: string;
  company_name: string;
  sector?: string;
  country?: string;
  employees_count?: number;
  service_type: string;
  service_description: string;
  expected_budget?: string;
  project_duration?: string;
}

export interface StudentReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  trainers: {
    id: string;
    slug: string;
    users: TrainerListItemUser;
    specializations: { id: string; name_ar: string; name_en: string } | null;
  } | null;
}

export interface PublicStudentProfile {
  id: string;
  full_name: string;
  username: string | null;
  profile_image: string | null;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  total_training_hours: number;
  role: string;
  created_at: string;
  completed_programs: Array<{
    id: string;
    completed_at: string | null;
    program: {
      id: string;
      title: string;
      slug: string;
      duration_hours: number | null;
      trainers: { id: string; slug: string; users: { full_name: string } } | null;
    };
  }>;
  certificates: Array<{
    id: string;
    title: string;
    verification_code: string;
    issued_at: string;
    training_hours: number | null;
    program: { id: string; title: string } | null;
    trainer: { id: string; slug: string; users: { full_name: string } } | null;
  }>;
  skills: StudentSkill[];
  stats: {
    completed_programs_count: number;
    certificates_count: number;
    skills_count: number;
    total_training_hours: number;
  };
}

export interface VerifyCertificateResponse {
  verified: boolean;
  status: string;
  certificate: {
    id: string;
    verification_code: string;
    title: string;
    description: string | null;
    issued_at: string;
    training_hours: number | null;
    pdf_url: string | null;
    qr_code_url: string | null;
    holder: { name: string; username: string | null; image: string | null };
    program: { title: string; duration_hours: number | null; level: string } | null;
    trainer: {
      name: string;
      image: string | null;
      slug: string;
      specialization: { name_ar: string; name_en: string } | null;
    } | null;
  };
  verified_at: string;
}

export interface VerifyUserResponse {
  verified: boolean;
  user: {
    name: string;
    username: string | null;
    image: string | null;
    bio: string | null;
    location: string | null;
    role: string;
    member_since: string;
  };
  certificates: Array<{
    id: string;
    verification_code: string;
    title: string;
    description: string | null;
    issued_at: string;
    training_hours: number | null;
    pdf_url: string | null;
    qr_code_url: string | null;
    program: { title: string; duration_hours: number | null } | null;
    trainer: { name: string; slug: string } | null;
  }>;
  completed_programs: Array<{
    id: string;
    completed_at: string | null;
    program: { title: string; duration_hours: number | null; level: string } | null;
    trainer: { name: string; slug: string } | null;
  }>;
  trainers: Array<{
    id: string;
    name: string;
    image: string | null;
    slug: string;
    specialization: { name_ar: string; name_en: string } | null;
  }>;
  skills: StudentSkill[];
  stats: {
    total_certificates: number;
    total_completed_programs: number;
    total_trainers: number;
    total_skills: number;
    total_training_hours: number;
  };
  verified_at: string;
}
