# Retired temporary catalog: safe cleanup

The site is moving to real instructor-authored courses. **Do not seed demo courses.**
The nine catalog categories are real configuration and must remain. The updated API
excludes dual-marked demos from every public catalog/count/detail/video path and
from new checkout/enrollment, even before cleanup is run.

## Clean the intended application database

Use Node 24. Back up the database, apply the additive course workflow schema
(`../course-workflow/README.md`), and use the backend's existing local `.env`:

```sh
cd tamkeenova-api
npm ci
npm run prisma:generate
npm run db:demo-courses:remove
```

The CLI uses Prisma and requires **both** markers:
- slug starts `demo-catalog-v1-`;
- English description starts `[TAMKEENOVA_DEMO_CATALOG_V1]`.

In a serializable transaction it deletes only unused marked demos and archives
ones with an instructor owner, enrollments, reviews, payment requests or certificates.
It preserves real courses (including partial marker collisions), all categories,
users, legacy programs and historical relationships. It reports deleted, archived
and protected counts. Reruns are safe. Do not convert a sample into a real offering:
create a new course through the trainer studio instead.

No live cleanup was possible in the coding sandbox: the attempted command stopped
because `DATABASE_URL` / `.env` was missing, before changing any data. Run the command
in your deployment environment; do not share credentials in chat or commit them.

## Connection troubleshooting

The CLI connects before opening a transaction, retrying transient connection setup
failures up to three times; writes are not replayed. For this process only it sets
`connection_limit=1`, `connect_timeout=30`, `pool_timeout=60`, with up to 60 seconds
for transaction acquisition. It never edits the backend's pool settings or `.env`.

If the Neon pooled endpoint is unavailable, optionally configure `DEMO_DATABASE_URL`
locally using the **Direct** connection URL for the **same branch/database/user**.
Keep its SSL options; do not guess hostnames. Neither retries nor larger timeouts
fix missing credentials, a blocked connection or an unavailable database server.

## Isolated regression fixtures only

`courses.json`, `seed.sql`, `remove.sql`, the old removal helper and local cover
artwork remain test fixtures, not production deployment instructions. The CLI
sample seeds now refuse execution unless `ALLOW_DEMO_CATALOG_SEED=true` is explicitly
set. Never enable it in production. No startup or migration automatically seeds demos.
Archived records may still reference the old cover files, so this cleanup does not
delete shipped assets or break retained history.

## Verify the cleanup in your database SQL editor

```sql
SELECT status, count(*) AS marked_courses
FROM courses
WHERE slug LIKE 'demo-catalog-v1-%'
  AND description_en LIKE '[TAMKEENOVA_DEMO_CATALOG_V1]%'
GROUP BY status;
```

After successful cleanup there should be no published marked demos; any remaining
marked courses should be archived to protect their history.
