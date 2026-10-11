# Course catalog schema (Prisma)

This is an additive foundation for the public, self-paced catalog inspired by almentor. It deliberately does **not** alter the existing `training_programs`, `student_enrollments`, or certificate relations: those represent Tamkeenova's current trainer-led training flow.

## New catalog concepts

- `course_categories` and `course_category_links`: bilingual, ordered category tree. The SQL seeds the nine top-level categories with local photo paths for the category cards; `parent_id` allows child categories.
- `courses` and `course_lessons`: bilingual course cards, language, level, video/podcourse type, free flag, publication state, lesson order, and catalog summary fields.
- `course_instructors`: connects a course to one or more existing `trainers` without duplicating trainer accounts.
- `course_enrollments` and `course_reviews`: course-specific learner progress and course-specific ratings; separate from existing program enrollments and trainer reviews.
- `course_collections` and `course_collection_items`: manually ordered shelves such as weekly top courses, trending, new releases, free courses, and podcourses.
- `learning_programs` and `learning_program_courses`: bundle courses into a learning path, distinct from the existing trainer-led `training_programs`.

The course-level `average_rating`, `ratings_count`, `enrollments_count`, `duration_minutes`, and `lessons_count` are listing-friendly summary fields. The catalog API should keep these summaries in sync with reviews, enrollments, and lessons when those APIs are added.

## Apply to a database

The repository currently uses standalone Prisma SQL scripts rather than a `prisma/migrations` history. `prisma/course-catalog.sql` is additive and idempotent and seeds the bilingual top-level categories plus empty homepage collections.

From `tamkeenova-api/`, after configuring `DATABASE_URL` and taking a database backup:

```bash
npm run db:course-catalog
npm run prisma:generate
```

If you prefer Prisma schema synchronization, run `npx prisma db push --schema prisma/schema.prisma` first, then `npm run db:course-catalog` to seed the categories and collections. The SQL uses `IF NOT EXISTS`/`ON CONFLICT`, so the seed/apply command can be rerun safely.

No database command was run while preparing this change. Review the schema and SQL, then apply them to your own database when ready.

## Public catalog API and Programs page

The public read-only API is registered at `/api/courses`:

- `GET /api/courses/categories` — active top-level categories and their active children.
- `GET /api/courses/collections` — active curated shelves with published courses.
- `GET /api/courses/learning-programs` — active learning paths with their published courses.
- `GET /api/courses` — published course cards; accepts `search`, `category`, `level`, `language`, `content_type`, `is_free`, `sort`, `page`, and `limit` query parameters.
- `GET /api/courses/:slug` — published course details and active lesson outlines.

The public `/programs` page now consumes these endpoints and remains named **Programs** at the same URL. Course detail cards use `/programs/course/:slug`. The existing trainer/admin program portals and legacy `/programs/:id` details route remain in place; no old training-program rows are migrated into the self-paced catalog.

The SQL seeds categories and empty shelves only—there are no course records yet. Until published course content is added, the page shows the categories and a localized empty-catalog state. Course enrollment and lesson playback endpoints are not part of this read-only catalog change.
