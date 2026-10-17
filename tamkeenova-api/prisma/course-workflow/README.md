# Recorded-course approval, manual checkout and certification

This workflow operates on `courses` / `course_enrollments`, **not** the legacy
`training_programs` / `student_enrollments`. Existing programs, demo courses,
YouTube links and certificates are not reset, republished or re-priced.

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
  lessons/durations/previews. Saving is not publishing. Submit separately; all
  existing active ADMIN/SUPER_ADMIN users receive a durable notification.
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
