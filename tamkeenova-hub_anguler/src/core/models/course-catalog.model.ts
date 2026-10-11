export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type CourseContentType = 'VIDEO' | 'PODCOURSE';

export interface CourseCategory {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  icon_name?: string | null;
  parent_id?: string | null;
  children?: CourseCategory[];
}

export interface CourseInstructor {
  id: string;
  slug: string;
  bio_ar?: string | null;
  bio_en?: string | null;
  users?: {
    full_name: string;
    profile_image?: string | null;
  };
  specializations?: {
    name_ar: string;
    name_en: string;
  } | null;
}

export interface Course {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  short_description_ar?: string | null;
  short_description_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  cover_image_url?: string | null;
  preview_video_url?: string | null;
  language: string;
  level?: CourseLevel | null;
  content_type: CourseContentType;
  is_free: boolean;
  duration_minutes: number;
  lessons_count: number;
  average_rating: number | string;
  ratings_count: number;
  enrollments_count: number;
  category_links?: Array<{
    is_primary: boolean;
    course_categories: CourseCategory;
  }>;
  instructors?: Array<{
    is_primary: boolean;
    trainers: CourseInstructor;
  }>;
  lessons?: Array<{
    id: string;
    title_ar: string;
    title_en: string;
    description_ar?: string | null;
    description_en?: string | null;
    duration_minutes: number;
    position: number;
    is_preview: boolean;
  }>;
}

export interface CourseCollection {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  courses: Course[];
}

export interface LearningProgram {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  short_description_ar?: string | null;
  short_description_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  cover_image_url?: string | null;
  partner_name_ar?: string | null;
  partner_name_en?: string | null;
  certificate_label_ar?: string | null;
  certificate_label_en?: string | null;
  is_free: boolean;
  is_featured: boolean;
  courses: Course[];
  course_categories?: CourseCategory | null;
}

export interface CourseCatalogResponse<T> {
  success: boolean;
  count?: number;
  data: T;
}

export interface CourseListResponse {
  success: boolean;
  count: number;
  data: Course[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
