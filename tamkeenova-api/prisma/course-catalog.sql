-- Additive course catalog schema for the self-paced almentor-style experience.
-- Safe to run more than once. Existing training_programs/enrollments/certificates
-- are deliberately left untouched.

BEGIN;

DO $$ BEGIN
  CREATE TYPE course_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE course_content_type AS ENUM ('VIDEO', 'PODCOURSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE course_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE course_enrollment_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS course_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_id uuid,
  slug varchar(180) NOT NULL,
  name_ar varchar(180) NOT NULL,
  name_en varchar(180) NOT NULL,
  description_ar text,
  description_en text,
  image_url text,
  icon_name varchar(80),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT course_categories_pkey PRIMARY KEY (id),
  CONSTRAINT course_categories_slug_key UNIQUE (slug),
  CONSTRAINT fk_course_category_parent FOREIGN KEY (parent_id)
    REFERENCES course_categories(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug varchar(255) NOT NULL,
  title_ar varchar(255) NOT NULL,
  title_en varchar(255) NOT NULL,
  short_description_ar text,
  short_description_en text,
  description_ar text,
  description_en text,
  cover_image_url text,
  preview_video_url text,
  language varchar(12) NOT NULL DEFAULT 'ar',
  level course_level,
  content_type course_content_type NOT NULL DEFAULT 'VIDEO',
  status course_status NOT NULL DEFAULT 'DRAFT',
  is_free boolean NOT NULL DEFAULT false,
  duration_minutes integer NOT NULL DEFAULT 0,
  lessons_count integer NOT NULL DEFAULT 0,
  average_rating decimal(3, 2) NOT NULL DEFAULT 0,
  ratings_count integer NOT NULL DEFAULT 0,
  enrollments_count integer NOT NULL DEFAULT 0,
  published_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title_ar varchar(255) NOT NULL,
  title_en varchar(255) NOT NULL,
  description_ar text,
  description_en text,
  media_url text,
  duration_minutes integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT course_lessons_pkey PRIMARY KEY (id),
  CONSTRAINT course_lessons_course_position_unique UNIQUE (course_id, position),
  CONSTRAINT fk_course_lesson_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS course_instructors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  trainer_id uuid NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT course_instructors_pkey PRIMARY KEY (id),
  CONSTRAINT course_instructors_course_trainer_unique UNIQUE (course_id, trainer_id),
  CONSTRAINT fk_course_instructor_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_course_instructor_trainer FOREIGN KEY (trainer_id)
    REFERENCES trainers(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS course_category_links (
  course_id uuid NOT NULL,
  category_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT course_category_links_pkey PRIMARY KEY (course_id, category_id),
  CONSTRAINT fk_course_category_link_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_course_category_link_category FOREIGN KEY (category_id)
    REFERENCES course_categories(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  status course_enrollment_status NOT NULL DEFAULT 'ACTIVE',
  progress integer NOT NULL DEFAULT 0,
  enrolled_at timestamptz(6) NOT NULL DEFAULT now(),
  completed_at timestamptz(6),
  last_accessed_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT course_enrollments_user_course_unique UNIQUE (user_id, course_id),
  CONSTRAINT fk_course_enrollment_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_course_enrollment_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS course_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  student_id uuid NOT NULL,
  rating smallint NOT NULL,
  comment text,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT course_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT course_reviews_course_student_unique UNIQUE (course_id, student_id),
  CONSTRAINT course_reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_course_review_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_course_review_student FOREIGN KEY (student_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS course_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug varchar(160) NOT NULL,
  title_ar varchar(180) NOT NULL,
  title_en varchar(180) NOT NULL,
  description_ar text,
  description_en text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT course_collections_pkey PRIMARY KEY (id),
  CONSTRAINT course_collections_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS course_collection_items (
  collection_id uuid NOT NULL,
  course_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT course_collection_items_pkey PRIMARY KEY (collection_id, course_id),
  CONSTRAINT course_collection_items_collection_position_unique UNIQUE (collection_id, position),
  CONSTRAINT fk_course_collection_item_collection FOREIGN KEY (collection_id)
    REFERENCES course_collections(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_course_collection_item_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS learning_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  slug varchar(255) NOT NULL,
  title_ar varchar(255) NOT NULL,
  title_en varchar(255) NOT NULL,
  short_description_ar text,
  short_description_en text,
  description_ar text,
  description_en text,
  cover_image_url text,
  partner_name_ar varchar(255),
  partner_name_en varchar(255),
  partner_logo_url text,
  certificate_label_ar varchar(255),
  certificate_label_en varchar(255),
  level course_level,
  is_free boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  published_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT learning_programs_pkey PRIMARY KEY (id),
  CONSTRAINT learning_programs_slug_key UNIQUE (slug),
  CONSTRAINT fk_learning_program_category FOREIGN KEY (category_id)
    REFERENCES course_categories(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS learning_program_courses (
  learning_program_id uuid NOT NULL,
  course_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT learning_program_courses_pkey PRIMARY KEY (learning_program_id, course_id),
  CONSTRAINT learning_program_courses_program_position_unique UNIQUE (learning_program_id, position),
  CONSTRAINT fk_learning_program_course_program FOREIGN KEY (learning_program_id)
    REFERENCES learning_programs(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_learning_program_course_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_course_categories_parent_order
  ON course_categories(parent_id, display_order);
CREATE INDEX IF NOT EXISTS idx_course_categories_active_order
  ON course_categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_courses_status_published
  ON courses(status, published_at);
CREATE INDEX IF NOT EXISTS idx_courses_type_status
  ON courses(content_type, status);
CREATE INDEX IF NOT EXISTS idx_courses_free_status
  ON courses(is_free, status);
CREATE INDEX IF NOT EXISTS idx_courses_enrollments_count
  ON courses(enrollments_count);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_active_order
  ON course_lessons(course_id, is_active, position);
CREATE INDEX IF NOT EXISTS idx_course_instructors_trainer_order
  ON course_instructors(trainer_id, display_order);
CREATE INDEX IF NOT EXISTS idx_course_category_links_category_order
  ON course_category_links(category_id, display_order);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_status
  ON course_enrollments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_status
  ON course_enrollments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_course_reviews_student
  ON course_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_course_collections_active_order
  ON course_collections(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_course_collection_items_course
  ON course_collection_items(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_programs_active_featured_order
  ON learning_programs(is_active, is_featured, display_order);
CREATE INDEX IF NOT EXISTS idx_learning_programs_category
  ON learning_programs(category_id);
CREATE INDEX IF NOT EXISTS idx_learning_programs_published
  ON learning_programs(published_at);
CREATE INDEX IF NOT EXISTS idx_learning_program_courses_course
  ON learning_program_courses(course_id);

-- Seed the nine top-level catalog categories discovered during the site review.
-- Child categories can be added later by setting parent_id to one of these rows.
INSERT INTO course_categories (slug, name_ar, name_en, display_order, image_url)
VALUES
  ('business-professional-skills', 'المهارات المهنية والأعمال', 'Business & Professional Skills', 1, '/assets/course-categories/business-professional-skills.jpg'),
  ('technology-innovation', 'التكنولوجيا والابتكار', 'Technology & Innovation', 2, '/assets/course-categories/technology-innovation.jpg'),
  ('arts-design-media', 'الفنون والتصميم والإعلام', 'Arts, Design & Media', 3, '/assets/course-categories/arts-design-media.jpg'),
  ('wellbeing', 'الصحة النفسية والجسدية', 'Wellbeing', 4, '/assets/course-categories/wellbeing.jpg'),
  ('lifestyle', 'أسلوب الحياة', 'Lifestyle', 5, '/assets/course-categories/lifestyle.jpg'),
  ('education-academics', 'التعليم والدراسات الأكاديمية', 'Education & Academics', 6, '/assets/course-categories/education-academics.jpg'),
  ('family-relationships', 'الأسرة والعلاقات', 'Family & Relationships', 7, '/assets/course-categories/family-relationships.jpg'),
  ('languages', 'اللغات', 'Languages', 8, '/assets/course-categories/languages.jpg'),
  ('soft-skills', 'المهارات الشخصية', 'Soft Skills', 9, '/assets/course-categories/soft-skills.jpg')
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  display_order = EXCLUDED.display_order,
  image_url = COALESCE(course_categories.image_url, EXCLUDED.image_url),
  updated_at = now();

-- Empty, ordered shelves are ready for course cards to be assigned in the admin/API.
INSERT INTO course_collections (slug, title_ar, title_en, display_order)
VALUES
  ('weekly-top-courses', 'أفضل الدورات هذا الأسبوع', 'Top Courses of the Week', 1),
  ('trending-courses', 'الدورات الرائجة', 'Trending Courses', 2),
  ('newly-released', 'أحدث الدورات', 'Newly Released', 3),
  ('free-courses', 'ابدأ بدورات مجانية', 'Start with Free Courses', 4),
  ('podcourses', 'بودكاست تعليمي', 'Podcourses', 5)
ON CONFLICT (slug) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  display_order = EXCLUDED.display_order,
  updated_at = now();

COMMIT;
