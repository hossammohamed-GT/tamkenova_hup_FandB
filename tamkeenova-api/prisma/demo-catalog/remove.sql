-- Removes ONLY this seed's marked courses. Never touches categories or training_programs.
BEGIN;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM courses c
    WHERE c.slug LIKE 'demo-catalog-v1-%'
      AND c.description_en LIKE '[TAMKEENOVA_DEMO_CATALOG_V1]%'
      AND (EXISTS (SELECT 1 FROM course_enrollments e WHERE e.course_id = c.id)
        OR EXISTS (SELECT 1 FROM course_reviews r WHERE r.course_id = c.id))
  ) THEN
    RAISE EXCEPTION 'Demo courses have enrollments/reviews. Removal cancelled to protect learner data. Review these records manually.';
  END IF;
END $$;
DELETE FROM courses WHERE slug LIKE 'demo-catalog-v1-%'
  AND description_en LIKE '[TAMKEENOVA_DEMO_CATALOG_V1]%';
COMMIT;
