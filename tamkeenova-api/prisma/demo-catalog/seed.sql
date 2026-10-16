-- Temporary presentation data only. No paid content, trainers, reviews or users are invented.
-- Re-runnable and additive: existing rows are never updated. Requires db:course-catalog first.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM course_categories WHERE is_active) THEN
    RAISE EXCEPTION 'No active categories. Run npm run db:course-catalog first.';
  END IF;
END $$;
CREATE TEMP TABLE demo_catalog_fixture (
  category_slug text, position integer, title_en text, title_ar text, cover text, duration integer
) ON COMMIT DROP;
INSERT INTO demo_catalog_fixture VALUES
  ('business-professional-skills', 1, 'Strategic Planning for Modern Business', 'التخطيط الاستراتيجي للأعمال الحديثة', '/assets/demo-courses/business-professional-skills-1.jpg', 90),
  ('business-professional-skills', 2, 'Project Management Fundamentals', 'أساسيات إدارة المشروعات', '/assets/demo-courses/business-professional-skills-2.jpg', 120),
  ('business-professional-skills', 3, 'Leadership and Team Management', 'القيادة وإدارة فرق العمل', '/assets/demo-courses/business-professional-skills-3.jpg', 150),
  ('technology-innovation', 1, 'Python for Everyday Problem Solving', 'بايثون لحل المشكلات اليومية', '/assets/demo-courses/technology-innovation-1.jpg', 90),
  ('technology-innovation', 2, 'Artificial Intelligence Essentials', 'أساسيات الذكاء الاصطناعي', '/assets/demo-courses/technology-innovation-2.jpg', 120),
  ('technology-innovation', 3, 'Build Your First Website', 'أنشئ موقعك الإلكتروني الأول', '/assets/demo-courses/technology-innovation-3.jpg', 150),
  ('arts-design-media', 1, 'Visual Design Fundamentals', 'أساسيات التصميم البصري', '/assets/demo-courses/arts-design-media-1.jpg', 90),
  ('arts-design-media', 2, 'Digital Photography Workshop', 'ورشة التصوير الفوتوغرافي الرقمي', '/assets/demo-courses/arts-design-media-2.jpg', 120),
  ('arts-design-media', 3, 'Tell Your Story with Video', 'احكِ قصتك بالفيديو', '/assets/demo-courses/arts-design-media-3.jpg', 150),
  ('wellbeing', 1, 'Mindfulness for a Balanced Life', 'اليقظة الذهنية لحياة متوازنة', '/assets/demo-courses/wellbeing-1.jpg', 90),
  ('wellbeing', 2, 'Understanding Emotional Wellbeing', 'فهم الصحة النفسية', '/assets/demo-courses/wellbeing-2.jpg', 120),
  ('wellbeing', 3, 'Healthy Habits That Last', 'عادات صحية تدوم', '/assets/demo-courses/wellbeing-3.jpg', 150),
  ('lifestyle', 1, 'Personal Finance Essentials', 'أساسيات إدارة أموالك الشخصية', '/assets/demo-courses/lifestyle-1.jpg', 90),
  ('lifestyle', 2, 'Fitness for Everyday Life', 'اللياقة للحياة اليومية', '/assets/demo-courses/lifestyle-2.jpg', 120),
  ('lifestyle', 3, 'Cooking with Confidence', 'الطهي بثقة', '/assets/demo-courses/lifestyle-3.jpg', 150),
  ('education-academics', 1, 'Learning How to Learn', 'تعلّم كيف تتعلّم', '/assets/demo-courses/education-academics-1.jpg', 90),
  ('education-academics', 2, 'Research and Critical Inquiry', 'البحث والاستقصاء النقدي', '/assets/demo-courses/education-academics-2.jpg', 120),
  ('education-academics', 3, 'Teaching in a Digital World', 'التدريس في عالم رقمي', '/assets/demo-courses/education-academics-3.jpg', 150),
  ('family-relationships', 1, 'Positive Parenting Foundations', 'أسس التربية الإيجابية', '/assets/demo-courses/family-relationships-1.jpg', 90),
  ('family-relationships', 2, 'Communication in Relationships', 'التواصل في العلاقات', '/assets/demo-courses/family-relationships-2.jpg', 120),
  ('family-relationships', 3, 'Building Stronger Family Bonds', 'بناء روابط أسرية أقوى', '/assets/demo-courses/family-relationships-3.jpg', 150),
  ('languages', 1, 'English for the Workplace', 'الإنجليزية في بيئة العمل', '/assets/demo-courses/languages-1.jpg', 90),
  ('languages', 2, 'Everyday Arabic Conversation', 'المحادثة العربية اليومية', '/assets/demo-courses/languages-2.jpg', 120),
  ('languages', 3, 'French for Beginners', 'الفرنسية للمبتدئين', '/assets/demo-courses/languages-3.jpg', 150),
  ('soft-skills', 1, 'Confident Public Speaking', 'التحدث أمام الجمهور بثقة', '/assets/demo-courses/soft-skills-1.jpg', 90),
  ('soft-skills', 2, 'Time Management and Productivity', 'إدارة الوقت والإنتاجية', '/assets/demo-courses/soft-skills-2.jpg', 120),
  ('soft-skills', 3, 'Negotiation and Collaboration', 'التفاوض والتعاون', '/assets/demo-courses/soft-skills-3.jpg', 150);
INSERT INTO courses (slug, title_en, title_ar, short_description_en, short_description_ar,
  description_en, description_ar, cover_image_url, language, level, content_type,
  status, is_free, duration_minutes, published_at)
SELECT 'demo-catalog-v1-' || c.slug || '-' || n,
  COALESCE(f.title_en, c.name_en || ': Practice Workshop ' || n),
  COALESCE(f.title_ar, c.name_ar || ': ورشة تطبيقية ' || n),
  'Temporary demo course for previewing the catalog. Not a real training offering.',
  'دورة تجريبية مؤقتة لمعاينة التصميم، وليست برنامجاً تدريبياً حقيقياً.',
  '[TAMKEENOVA_DEMO_CATALOG_V1] Temporary display data. No lesson videos or instructor claims. Remove with db:demo-courses:remove.',
  'بيانات عرض تجريبية مؤقتة. لا تحتوي على فيديوهات دروس أو مدرّبين حقيقيين.',
  COALESCE(f.cover, '/assets/demo-courses/generic-' || n || '.jpg'),
  'ar', 'BEGINNER', 'VIDEO', 'PUBLISHED', true, COALESCE(f.duration, 60 + n * 30), now()
FROM course_categories c CROSS JOIN generate_series(1, 3) AS n
LEFT JOIN demo_catalog_fixture f ON f.category_slug = c.slug AND f.position = n
WHERE c.is_active
ON CONFLICT (slug) DO NOTHING;
INSERT INTO course_category_links (course_id, category_id, is_primary, display_order)
SELECT course.id, category.id, true, n
FROM course_categories category CROSS JOIN generate_series(1, 3) AS n
JOIN courses course ON course.slug = 'demo-catalog-v1-' || category.slug || '-' || n
WHERE category.is_active AND course.description_en LIKE '[TAMKEENOVA_DEMO_CATALOG_V1]%'
ON CONFLICT (course_id, category_id) DO NOTHING;
COMMIT;
