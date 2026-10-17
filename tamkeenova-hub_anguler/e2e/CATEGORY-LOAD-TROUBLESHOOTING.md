# Admin category load failures

The management page uses **GET `/api/admin/course-categories`**, authenticated as
ADMIN or SUPER_ADMIN. The frontend and backend must both include the category
management feature. A failed load is not evidence that the database has no
categories: the UI now shows a separate failure state and Retry, and accepts an
empty state only after a successful, structurally valid response.

## Diagnose the deployed request

In browser DevTools → Network, reload `/portal/admin/course-categories` and inspect
`course-categories` (GET). Record only its URL, HTTP status, and non-sensitive error
code/message. Do not share a token, cookie, Authorization header, or a HAR containing
credentials.

- **0 / failed request:** inspect connection, API availability, proxy and CORS.
- **401:** sign in again; inspect session expiration if it repeats.
- **403:** check the account's current server-side role. Do not remove the guards.
- **404:** inspect the API deployment revision and the `/api` proxy target. Ensure
  the backend contains `CategoryModule`; do not send API requests to the SPA fallback.
- **200 with HTML / incompatible JSON:** fix the API proxy or incompatible deployment.
  The manager response must contain `data: []` or management rows with `_count`
  (`children`, `course_links`, `learning_programs`). Do not substitute public category
  data; it lacks hidden categories and safe-deletion reference counts.
- **5xx:** inspect backend logs for the same request. Check database connectivity,
  configured environment variables, and Prisma schema compatibility. If logs identify
  missing catalog tables or columns, review `tamkeenova-api/prisma/schema.prisma`
  and the existing additive catalog SQL before applying a backed-up migration.
  Never reset the database or seed fake courses to hide a load failure.

The original screenshot alone did **not** establish the deployed HTTP failure.
The user subsequently confirmed that categories loaded normally after refreshing
the backend runtime / clearing its cached state. No database edits were needed.
The frontend failure-state safeguards are retained to avoid misleading empty states
if another loading failure occurs. Live recovery was reported by the user, not
independently verified against their deployment.

## Local verification

- Angular tests: `npm test -- --watch=false`
- Browser regression: `npx playwright test e2e/course-categories-admin.spec.ts`
- Production build: `npm run build`

The browser suite mocks the API deliberately; it verifies AR/EN rendering, network,
404, 500, HTML and incompatible-response failures, successful Retry, genuine empty
results, and existing CRUD behavior. It does not validate the live deployment.
