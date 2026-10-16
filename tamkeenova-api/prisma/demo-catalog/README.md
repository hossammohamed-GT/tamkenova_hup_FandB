# Temporary catalog preview courses

Adds **3 published, free demo courses per active category** (27 for the current
nine categories). Active child categories and future categories also receive
three generic workshops. These are clearly marked presentation records, not
real training content: no video URLs, trainers, user accounts, fabricated ratings,
reviews or enrollments are inserted. The declared durations are sample values.

## Add to your database

Use Node.js 24 (as required by the backend). From the repository root, with the backend's `.env` containing your existing
`DATABASE_URL` for the intended database:

```bash
cd tamkeenova-api
npm ci
npm run prisma:generate
npm run db:demo-courses
```

The commands use **Prisma Client and the models in `schema.prisma`**, with the
same `DATABASE_URL` as the backend. They only modify data, never the database
schema. After seeding, a table prints the actual demo count for every active
category and the number of newly inserted courses. Re-running should show zero
new inserts and three demos per category. No active categories is an explicit
error instead of a silent successful no-op.

If catalog tables/columns are missing, review the schema/database difference
before applying your normal Prisma schema workflow. Do not use `migrate reset`,
`--force-reset`, or `--accept-data-loss` to fix missing preview data. The legacy
`seed.sql` and `remove.sql` are retained as SQL fixtures, not the default commands.

### Connection troubleshooting (Neon)

The CLI opens the connection **before** starting a data transaction and retries
transient connection setup failures up to three times. It does not retry writes.
For this CLI process only it uses `connection_limit=1`, `connect_timeout=30` and
`pool_timeout=60`, and gives transaction acquisition up to 60 seconds. These
settings do not edit `.env`, the backend pool, or the database schema. A larger
connection timeout alone does not increase Prisma's pool acquisition timeout.

If the pooled endpoint is still unavailable, copy the **Direct** connection URL
from Neon Connect for the **same branch, database and user** into an optional
`DEMO_DATABASE_URL` variable in your local backend `.env`. Keep its SSL settings.
The demo CLI prefers this URL, while the backend continues using `DATABASE_URL`.
Do not infer a direct hostname by editing the pooler hostname manually. Neither
longer timeouts nor retries can repair an unavailable server or blocked network.

No database credentials should be committed or pasted into chat. Confirm your
connection targets a development/staging database before running the command.
The seed is transactional, additive and re-runnable: it never overwrites an
existing course or edits real categories. It uses reserved `demo-catalog-v1-`
slugs together with a `[TAMKEENOVA_DEMO_CATALOG_V1]` description marker.

The 30 local JPG covers (27 named + 3 fallback covers) are already checked into
`tamkeenova-hub_anguler/public/assets/demo-courses/`. Deploy the frontend from
this branch too; image URLs are frontend-relative, not backend routes. To
regenerate the artwork after changing `courses.json`:

```bash
cd ../tamkeenova-hub_anguler
npm ci
node scripts/build-demo-course-artwork.mjs
```

## Remove ONLY the demo courses later

From `tamkeenova-api`:

```bash
npm run db:demo-courses:remove
```

Removal checks **both** the reserved slug prefix and the description marker. It
does not delete categories, users, trainers or legacy training programs. Foreign
keys cascade the deleted demo courses' category links. If any demo course has
acquired enrollments or reviews, removal aborts the entire transaction rather
than silently deleting learner history. Review these records manually first.
Real courses and non-marked slug collisions are retained.

Do not convert a seeded row into a real course: create a new real course instead.

### Remove the temporary image files too

The database cleanup removes the courses and their cover references; it cannot delete
files shipped with the frontend. **Only after database cleanup succeeds**, and after
confirming no real course reuses these demo covers, run this from the repository
root to remove the dedicated demo-image folder:

```bash
node -e "require('node:fs').rmSync('tamkeenova-hub_anguler/public/assets/demo-courses', { recursive: true, force: true })"
```

Rebuild and redeploy the frontend to remove the images from the deployed assets.
Do not run the artwork generator again unless you want to restore these covers.

## SQL verification (optional, in your database SQL editor)

```sql
SELECT cat.slug, count(*) AS demo_courses
FROM courses c JOIN course_category_links l ON l.course_id = c.id
JOIN course_categories cat ON cat.id = l.category_id
WHERE c.description_en LIKE '[TAMKEENOVA_DEMO_CATALOG_V1]%'
GROUP BY cat.slug ORDER BY cat.slug;
```
