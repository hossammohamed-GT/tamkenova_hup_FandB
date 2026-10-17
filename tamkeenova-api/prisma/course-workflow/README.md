# Recorded-course approval, manual checkout and certification

This workflow operates on `courses` / `course_enrollments`, **not** the legacy
`training_programs` / `student_enrollments`. Real programs, YouTube links and certificates are not reset, republished or re-priced.
Temporary catalog demos are now retired; see the cleanup section below.

## Deployment (Node 24, existing application database)

1. Back up the database and review `schema-statements.cjs` against your deployed schema.
   The existing certificate tables/template fields and course catalog must already exist.
2. From `tamkeenova-api`, using the deployment's normal `DATABASE_URL` and `JWT_SECRET`:

   ```sh
   npm ci
   npm run prisma:generate
   # Only if the previous chapter/YouTube addition has not yet been applied:
   npm run db:course-videos
   npm run db:course-workflow
   npx prisma validate
   # Retire the old marked catalog samples; preserves real courses and learner history:
   npm run db:demo-courses:remove
   npm run build
   ```

   `db:course-workflow` is additive, re-runnable, bounded, and runs its constant
   DDL in one transaction. It uses the existing pool-safe connection/retry helper.
   It does not run `db push`, reset a database, insert sample bank accounts,
   erase payments, or enable checkout. Deploy this schema **before** the new API
   and frontend. A normal, engine-enabled Prisma client is required in deployment;
   the sandbox's `generate --no-engine` type-check workaround is not a runtime setup.
3. Build/deploy the frontend (`cd ../tamkeenova-hub_anguler && npm ci && npm run build`).
4. As an active admin, visit `/portal/admin/course-workflow` → **Payment settings**.
   Enter real Vodafone Cash / InstaPay receiving accounts, instructions, and enable
   reporting. No receiving account is supplied by the code. Until configured,
   paid checkout offers no destination or transfer-report form.

`prisma/schema.prisma` describes every added model, column, relation and ordinary
index. PostgreSQL-only safeguards also live in `schema-statements.cjs`: preserve
`course_payment_one_pending` (a partial unique index), the positive-amount,
method/state and approval-consistency checks in future migrations. Do not use
unreviewed schema synchronization to replace these constraints.

## Operator / learner journey

* Approved instructor: `/portal/trainer/courses`. Create a bilingual draft with
  a category, intro YouTube URL, cover, EGP price (0 = free), chapters and YouTube
  lessons/durations/previews. Main/subcategories come from the existing public catalog.
  The form supports separate card summaries, full descriptions, VIDEO/PODCOURSE,
  language, level and per-lesson descriptions. Chapters and lessons can be reordered.
  Saving is not publishing: choose **Save draft** (incomplete video URLs are allowed)
  or **Save & submit for review** (publishing validation requires YouTube intro/lessons).
  All existing active ADMIN/SUPER_ADMIN users receive a durable submission notification.
  Dashboard **Add course / program** opens `/portal/trainer/courses?new=1` directly.
  Trainers are authors, not learners: navbar/library/checkout links redirect to the
  studio, and learner workflow APIs reject TRAINER accounts. Old
  `/portal/trainer/programs` redirects here; historical program tools remain at
  `/portal/trainer/legacy-programs` without moving or deleting legacy records.
* Admin: **Course reviews**. Inspect introduction and every chapter/lesson, then
  approve the submitted revision or reject with a reason. Any one admin suffices.
  Rejected drafts can be edited/resubmitted. Pending, published, or already-enrolled
  course content cannot be replaced through the authoring endpoint.
* Learner: public course → enrollment/checkout. Free enrollment saves progress
  immediately. Paid checkout shows only enabled destinations and the quoted EGP
  price. After actually transferring, report sender account, exact amount, time,
  optional transfer reference and notes. **A report does not grant access.**
* Checkout quotes expire after 24 hours and bind user, course, amount and receiving
  account snapshot. A valid prior quote may still be reported after account settings
  change: an already-sent transfer must not silently get attributed to a new account.
  If a quote has expired after payment, contact the administrator; **do not pay again**.
* Admin: **Payment reviews**. Check the actual account independently. Confirm the
  exact quoted amount received and the actual transaction reference; approve to
  activate access, or reject with an actionable reason. Neither a sender report nor
  a checked UI box verifies a bank transfer automatically. Underpayment, overpayment,
  duplicate/already-active enrollment, withdrawn courses and refunds require manual
  reconciliation; no refund or provider integration is implied.
* Learner: mark lessons complete; these are self-reported completion records, **not
  trusted YouTube watch telemetry**. Once every lesson is marked, enter AR/EN certificate
  names and request instructor confirmation. Only the owning approved instructor can
  approve or return the request with feedback. Authors cannot enroll/certify themselves.
* Instructor approval atomically completes enrollment, creates one linked bilingual
  certificate using the existing **2026.3 TRAINING template**, logs the decision and
  notifies the learner. Payment/enrollment/100% progress alone cannot issue it.
  Certificates appear in `/my-courses` and existing certificate lists, with existing
  Arabic/English PDF rendering, verification and admin revocation behavior. No
  certificate email delivery is promised by this workflow.
* `/my-courses` also shows pending/rejected transfer reports. Notifications deep-link
  to the right publication, transfer, instructor or learner area; visible sessions
  poll unread notifications every 30 seconds. Existing training-program tools remain
  separate and available. Profile/verification completion counts include recorded courses.

## Retired temporary catalog

The API excludes courses with **both** the `demo-catalog-v1-` slug prefix and
`[TAMKEENOVA_DEMO_CATALOG_V1]` English-description marker from category counts,
search, shelves, program links, direct detail/access/playback and new checkout/enrollment.
A real course matching only one marker is retained, including NULL descriptions.
The nine real categories remain available for instructors; no replacement samples are inserted.

After backing up and applying the workflow schema, run from the API directory with
its normal database environment:

```sh
npm run db:demo-courses:remove
```

This transaction deletes only unused dual-marked demos. Demos with an owner,
enrollments, reviews, payment requests or certificates are archived instead;
relationships and financial/certificate history are retained. Repeat runs are safe.
Existing private history is not erased; archiving prevents new public enrollment.
Seeding catalog/video samples now requires explicit `ALLOW_DEMO_CATALOG_SEED=true`
for isolated tests only. Never enable it during deployment. See
`../demo-catalog/README.md` for connection troubleshooting.

**Sandbox limitation:** cleanup was attempted but could not connect because no
`DATABASE_URL` / backend `.env` was supplied. No live records were deleted or archived.
Public exclusion takes effect when this updated API is deployed; physical cleanup
must run against the intended database in the deployment environment.

## Consistency / security

JWT guards re-read active users and current DB roles. Ownership is checked server-side;
DTOs reject client-controlled status/owner fields. Paid lesson URLs remain behind the
existing enrolled-only playback endpoint. Private workflow reads use `private, no-store`.
Money is handled in exact cents; an admin must supply an independently confirmed amount.
Pending reports are unique per learner/course; confirmed references are normalized and
unique per provider. Publication/payment/completion decisions use state/revision CAS;
uniqueness failures become conflicts. Progress updates lock the enrollment before counting.
Transactions keep access, certificate, notification and audit changes together.

Queues/history currently return up to 100 records per endpoint. Operators should regularly
clear review queues; this release does not provide bulk review/export or infinite scrolling.

## Reproducible local checks

```sh
# API (Nest HTTP/auth/role/DTO tests, service rules, public integration,
# plus real additive DDL / uniqueness / CAS checks in local PGlite PostgreSQL)
npm run test:course-workflow
npm run test:course-videos
npm run test:demo-courses
npx tsc --noEmit -p tsconfig.json

# Frontend
cd ../tamkeenova-hub_anguler
npm test -- --watch=false
npm run build
# With an Angular dev server already running on :4200 and Playwright Chromium installed:
npx playwright test e2e/course-workflow.spec.ts e2e/course-videos.spec.ts \
  e2e/program-categories.spec.ts e2e/programs-mega-menu.spec.ts
```

Browser tests use explicitly mocked API fixtures and local artwork/fonts; the course library
PDF test renders/downloads the real existing template. Unit/HTTP tests mock Prisma;
PGlite executes the SQL constraints, not a deployed Prisma connection. These checks do not
claim production DB deployment, actual transfer receipt, email delivery or live YouTube
embedding availability.

## Field-level validation and mismatched deployment versions

API validation now includes `field_errors` keyed by exact paths such as
`short_description_ar` or `sections.0.lessons.1.description_en`, alongside the
backward-compatible `message` array. The shared application validation pipe
keeps whitelisting/unknown-field rejection enabled and omits target/value data.
The global exception filter preserves those paths. Course business validation
also identifies the affected intro, cover, category, chapter/lesson, account,
transfer date, review reference/amount and rejection note where applicable.

The authoring, checkout, admin operations and completion-name forms use shared
`FormFeedback` + `INLINE_ERRORS` helpers. Local errors show after blur or an
attempted submission; server errors render beneath the matching field with
`aria-invalid` / `aria-describedby`. Focus scrolls to the first problem. Unmapped,
permission/network/conflict errors stay beside the relevant form/action, not in
a page-wide list. Dynamic lesson paths use current indices; reorder/removal clears
stale errors. Entries remain in the open form after a failed request. No automatic
POST retry, silent field removal or local-storage draft persistence is performed.

If a server returns **`property short_description_ar should not exist`** (likewise
`short_description_en`, `content_type` or nested lesson descriptions), the API
that received the request does not support the current authoring contract. These
fields already have validators in `CourseDraftDto` / `LessonDraftDto` in this
branch; regression tests send both lessons' descriptions through Nest's actual
validation pipeline. Do not remove the fields or turn off whitelisting to bypass it.

**Deploy the backend and frontend from the same revision.** A frontend-only deploy
or restarting an old `dist` build cannot fix this. For local development, stop the
old API process, pull/update the working branch, install its dependencies if needed,
and run `npm run start:dev` from `tamkeenova-api`. In production, run `npm ci` and
`npm run build` on that revision, then restart/redeploy the API service using your
normal hosting process. Verify the frontend `/api` proxy points at that updated
service. Follow the existing additive schema deployment steps above if not already
applied; this validation fix itself adds no schema changes and requires no reset.

The browser also recognizes the legacy nested whitelist error format, highlights
the corresponding fields, and gives an explicit matching-backend deployment notice
without discarding the submitted metadata. The coding sandbox does not control
or verify the user's running/deployed API process.
