export type TrainerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TrainerDocument {
  file_name: string;
  file_url: string;
  file_type: string;
}

// -- Additional Trainer Registration Fields --
export interface TrainerRegisterExtra {
  specialization_id: string;
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
  documents?: TrainerDocument[];
}

export interface ApplicationStatusData {
  status: TrainerStatus;
  rejection_reason: string | null;
  approved_at: string | null;
}

export interface TrainerCertificate {
  id: string;
  trainer_id: string;
  title: string | null;
  certificate_url: string;
  created_at: string;
}

export interface TrainerDocumentRecord {
  id: string;
  trainer_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export interface TrainerProfile {
  id: string;
  user_id: string;
  slug: string;
  bio_ar: string | null;
  bio_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  years_of_experience: number;
  consultation_price: string;
  discount_percentage: string;
  average_rating: string;
  ratings_count: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  trainer_status: TrainerStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  specialization_id: string;
  linkedin_url: string | null;
  website_url: string | null;
  facebook_url: string | null;
  portfolio_url: string | null;
  cover_letter: string | null;
  consultation_price_from: string | null;
  consultation_price_to: string | null;
  consultation_duration: number | null;
  is_featured: boolean;
  total_students: number;
  users: {
    id: string;
    full_name: string;
    username: string;
    email: string;
    phone: string;
    role: string;
    profile_image: string | null;
    email_verified: boolean;
    is_active: boolean;
    created_at: string;
  };
  specializations: {
    id: string;
    name_ar: string;
    name_en: string;
    created_at: string;
  };
  trainer_certificates: TrainerCertificate[];
  trainer_documents: TrainerDocumentRecord[];
}

export interface UpdateTrainerProfilePayload {
  bio_ar?: string;
  bio_en?: string;
  description_ar?: string;
  description_en?: string;
  linkedin_url?: string;
  facebook_url?: string;
  website_url?: string;
  portfolio_url?: string;
  consultation_price_from?: number;
  consultation_price_to?: number;
  consultation_duration?: number;
  certificate_urls?: string[];
  documents?: TrainerDocument[];
}

export type ProgramLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface TrainerProgram {
  id: string;
  title: string;
  image_url?: string;
  short_description?: string;
  description?: string;
  price: number;
  discount_price?: number;
  duration_hours?: number;
  level: ProgramLevel;
}

export type ProgramPayload = Omit<TrainerProgram, 'id'>;

export interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export type AvailabilityPayload = Omit<AvailabilitySlot, 'id'>;

export interface TrainerReview {
  rating: number;
  comment: string;
  created_at: string;
}

export interface TrainerDashboardStats {
  programs_count: number;
  reviews_count: number;
  availability_count: number;
  average_rating: number;
  ratings_count: number;
}
