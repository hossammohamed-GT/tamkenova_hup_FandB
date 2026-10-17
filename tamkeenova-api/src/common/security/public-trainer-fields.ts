import type { Prisma } from '@prisma/client';

export const publicTrainerFields = {
  id: true,
  slug: true,
  trainer_status: true,
  bio_ar: true,
  bio_en: true,
  description_ar: true,
  description_en: true,
  years_of_experience: true,
  consultation_price: true,
  discount_percentage: true,
  consultation_price_from: true,
  consultation_price_to: true,
  consultation_duration: true,
  average_rating: true,
  ratings_count: true,
  total_students: true,
  is_available: true,
  is_featured: true,
  created_at: true,
  specialization_id: true,
  linkedin_url: true,
  facebook_url: true,
  website_url: true,
  portfolio_url: true,
} satisfies Prisma.trainersSelect;

export const publicReviewFields = {
  id: true,
  rating: true,
  comment: true,
  created_at: true,
  users: { select: { full_name: true, profile_image: true } },
} satisfies Prisma.trainer_reviewsSelect;
