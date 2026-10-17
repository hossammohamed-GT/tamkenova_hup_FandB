# Team directory, profiles and one-time ratings

## Scope

- `/team`: reference-inspired geometric hero/portraits, live aggregate metrics,
  search, specialty/experience/availability filters, sorting, grid/list layout,
  specialty-themed instructor cards and local saved-instructor state.
- `/team/:slug`: dark teal geometric profile hero, real biography/expertise,
  publicly visible courses, reviews, qualifications, safe social links and the
  existing consultation booking flow.
- Shared instructor cards remain usable on the home page. The shared rating
  component also serves the learner portal; there is no separate repeat-vote UI.
- Arabic/English, RTL/LTR, light/dark, keyboard interaction, reduced motion and
  narrow/mobile layouts are covered by automated tests.

## Frosted glass and default portraits

- Directory hero, filter toolbar, geometric shared instructor cards, profile
  overview/sidebar panels, profile hero summary, sticky tabs and rating popovers
  use translucent surfaces, backdrop blur, fine highlight borders and restrained
  shadows. Theme-local muted text remains readable in dark mode. No text or
  actionable content is blurred. Opaque fallbacks cover browsers without blur
  support and the `prefers-reduced-transparency` accessibility preference.
- Missing, blank and failed image URLs use the original local
  `/assets/trainers/default-portrait.svg` illustration. Uploaded portraits keep
  priority. The same directive covers home/shared cards, the directory collage,
  both profile portraits and learner-portal avatars; updated image inputs can
  recover from an earlier failed image without a reload.
- The hero always has four decorative slots, including with zero/one instructor,
  without changing real instructor counts or introducing fictional profiles.
  See `public/assets/trainers/README.md` for asset provenance.

## Rating contract

Deploy the frontend and API together.

1. `GET /api/trainers/reviews/mine` requires a valid STUDENT/CLIENT session. It
   returns only the authenticated learner's `{ trainer_id, rating }` entries.
   The response is private and non-cacheable. The client loads this once per
   account, blocks voting while checking or on failure, and offers retry.
2. Hovering or focusing the card's rating summary opens five stars above it.
   Keyboard users can select a star; Escape closes the popup and restores focus.
   Mobile users can tap the summary.
3. `POST /api/trainers/:trainerId/reviews` is a one-time creation, not an upsert.
   Both the existing-review check and database unique-conflict path return 409.
   Duplicate submissions never modify the saved review or its written comment.
4. A successful response updates the displayed aggregate from the server and
   switches every mounted instance to the read-only confirmation. Reloads hydrate
   that state from the API. A 409 also locks the picker; a service outage does not
   pretend the vote was saved. Switching accounts cancels status requests and
   clears account-specific state.
5. Existing explicit review-management endpoints remain separate and unchanged.

The existing Prisma unique constraint on `[trainer_id, student_id]` is reused.
There is no schema migration, reset, seed or database synchronization for this
feature. Saved-instructor bookmarks are browser-local, not a server collection.

## Verification

From `tamkeenova-hub_anguler`:

```sh
npm test -- --watch=false
npm run build
npx playwright test --reporter=line
```

Playwright expects the frontend running on port 4200 (see `playwright.config.ts`).
The focused suite is `e2e/team-geometric.spec.ts`. It exercises EN/AR and dark/light
at 320–1536px; navigation, filtering, sorting, saved state, booking, keyboard
focus, initial/reloaded rating locks, 409/503 behavior, role restrictions, status
retry, unavailable profiles, empty/error results and broken-image fallback.

From `tamkeenova-api`:

```sh
npm run test:trainers
npm run test:course-workflow
npx nest build
npm run lint
```

The trainer tests cover authorization/identity, private status responses, DTO
validation, duplicate races and service behavior. Database and external-service
boundaries are mocked. Browser names, images, courses, reviews and metrics are
explicit test fixtures only; see `e2e/fixtures/instructors/README.md`. Production
uses real API data and profile images; no fixture instructor is seeded or added
to public assets. These checks do not establish live database, deployment,
payment, storage or YouTube availability.
