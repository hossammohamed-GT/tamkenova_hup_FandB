// Additive DDL matching course_sections and course_lessons in schema.prisma.
// Applied in one Prisma transaction; no DROP, reset, or changes to existing rows.
module.exports = [
  `CREATE TABLE IF NOT EXISTS course_sections (
    id uuid NOT NULL DEFAULT gen_random_uuid(), course_id uuid NOT NULL,
    title_ar varchar(255) NOT NULL, title_en varchar(255) NOT NULL,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz(6) NOT NULL DEFAULT now(), updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT course_sections_pkey PRIMARY KEY (id),
    CONSTRAINT fk_course_section_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT course_sections_id_course_unique UNIQUE (id, course_id),
    CONSTRAINT course_sections_course_position_unique UNIQUE (course_id, position)
  )`,
  `ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS section_id uuid`,
  `CREATE INDEX IF NOT EXISTS idx_course_lessons_section ON course_lessons(section_id)`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_course_lesson_section' AND conrelid = 'course_lessons'::regclass) THEN
      ALTER TABLE course_lessons ADD CONSTRAINT fk_course_lesson_section FOREIGN KEY (section_id, course_id)
        REFERENCES course_sections(id, course_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
  END $$`,
];
