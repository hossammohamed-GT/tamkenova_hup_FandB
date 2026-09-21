export interface TrainerUser {
  id: string;
  full_name: string;
  username: string;
  profile_image: string | null;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TrainerSpecialization {
  id: string;
  name_ar: string;
  name_en: string;
  created_at: string;
}

export interface TrainerCertificate {
  id: string;
  trainer_id: string;
  title: string | null;
  certificate_url: string;
  created_at: string;
}

export interface TrainerCounts {
  training_programs: number;
  trainer_reviews: number;
}

export interface Trainer {
  id: string;
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
  is_featured: boolean;
  total_students: number;
  trainer_status: string;
  specialization_id: string;
  linkedin_url: string | null;
  website_url: string | null;
  facebook_url: string | null;
  portfolio_url: string | null;
  cover_letter: string | null;
  consultation_price_from: string | null;
  consultation_price_to: string | null;
  consultation_duration: number | null;
  created_at: string;
  updated_at: string;

  users: TrainerUser;
  specializations: TrainerSpecialization;
  trainer_certificates: TrainerCertificate[];
  _count: TrainerCounts;

  avatar?: string;
  name?: string;
  specialization?: string;
  rating?: number;

  training_programs: TrainerProgramPreview[];
  trainer_reviews: TrainerReviewPreview[];
}

export interface TrainerProgramPreview {
  id: string;
  title: string;
  image_url?: string | null;
  price?: string;
}

export interface TrainerReviewPreview {
  id: string;
  rating: number;
  comment?: string | null;
}
