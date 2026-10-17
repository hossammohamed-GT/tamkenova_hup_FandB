# YouTube course introductions and chapter lessons

## Apply safely to the existing database

Use Node 24 and the existing backend `.env`. Back up the target database first.
The Prisma models are in `schema.prisma`. The additive helper applies only their
new chapter table and nullable lesson relation, avoiding a broad `db push` over
unrelated legacy tables. It is transactional and re-runnable; it neither resets
any table nor changes/deletes existing courses, lessons or enrollments.

Stop the backend watcher before regenerating Prisma on Windows (to release the
Prisma DLL), then run from `tamkeenova-api`:

```bat
npm run db:course-videos
npm run prisma:generate
npm run start:dev
```

**Temporary demo videos are retired.** Do not seed samples in deployment.
Instructors now add real introductions, chapters and lessons in
`/portal/trainer/courses`; see `../course-workflow/README.md` for approval and checkout.
The old video seed remains an isolated test fixture and refuses execution without
`ALLOW_DEMO_CATALOG_SEED=true`. `npm run db:demo-courses:remove` deletes unused
marked demos and archives those with owners or learner/payment/certificate history.

Both helpers use the CLI connection budget/retries from `demo-catalog/manage.cjs`.
`DEMO_DATABASE_URL`, if present, must target the SAME branch/database as the
backend. No secrets or actual production connection strings belong in Git.
The schema helper can run with the old generated client because its new DDL is
constant SQL executed through Prisma; generate the updated client immediately
before starting the updated backend.

## Edit your actual courses using Prisma Studio

```bat
npx prisma studio
```

- `courses.preview_video_url`: the course introduction's YouTube URL.
- `course_sections`: set `course_id`, bilingual title and `position` (0, 1, …).
- `course_lessons`: set the SAME `course_id`, optional `section_id`, bilingual
  title, `media_url` (YouTube), `is_preview`, `is_active`, and `position`.
- Lesson positions are global within a course (0, 1, 2, …), not restarted per
  chapter; the existing unique course/position constraint is preserved.
- A composite FK prevents assigning a lesson to a different course's chapter.
  Detach lessons or move them first before deleting an individual chapter.
- Legacy lessons with no chapter are displayed under a fallback Lessons group.

Supported URLs: watch?v=, youtu.be, embed, shorts and live links (single videos).
Playlist parameters are deliberately ignored. Arbitrary sites/iframe HTML are
rejected by the player. YouTube embeds retain YouTube controls and branding;
TamkeeNova branding is in a top-left strip ABOVE the iframe, never obscuring
YouTube UI. The site's fullscreen button includes this strip. YouTube's native
fullscreen is controlled by YouTube and does not include surrounding site UI.
Embedding can be disabled by the video owner or restricted by region/account;
an Open on YouTube fallback is always available for a valid video ID.

## Access rules

Introductions and flagged preview lessons are public. All lessons in a free
course are public. The public course API strips other lesson media URLs. For
paid courses, the guarded access/playback endpoints require the authenticated
user's ACTIVE or COMPLETED `course_enrollments` row; cancelled/suspended or
another user's enrollment does not grant access. Manual payment reporting, reviewed access and free enrollment are implemented by
the separate course workflow; see `../course-workflow/README.md`.
YouTube links are not DRM: authorized viewers can inspect/share URLs, and public
YouTube videos remain available outside this site.
