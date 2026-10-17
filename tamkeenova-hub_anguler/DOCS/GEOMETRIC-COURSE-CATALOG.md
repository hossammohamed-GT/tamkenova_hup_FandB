# Geometric course catalog

The `#course-list` (previously the plain “Browse all courses” grid) is a layered
catalog workspace inspired by the supplied reference. Existing category sculptures,
selected-category image flight, curated shelves and learning paths are preserved.

## Components and real data

- `geometric-course-card.component.*`: hand-drawn irregular SVG frame, unique image
  clipPath per instance, translucent facets, category-colored emblem, small cubes,
  overlapping information face and normal Angular HTML for text and controls.
- Palette comes from the primary category; a subcategory inherits its parent's
  palette. Primary instructor, specialty, reviews, price, duration and level come
  from the existing public course response. Missing photos degrade gracefully.
- “New” requires a valid `published_at` in the last 30 days, not a fabricated flag.
  No unsubstantiated Bestseller badge, fake rating or invented course is added.
- Sidebar, mobile category selector, search, filters, sorting, load-more, grid/list
  and detail links work with the existing API. Superseded course requests are
  canceled; query navigation from the workspace preserves its scroll position.
- Bookmarks are **device-local** IDs in `tamkeenova-course-bookmarks-v1`, not a
  server-synced account feature. Accessible labels/tooltips state this limitation.
  If storage fails, the toggle works for the session and announces that explicitly.
  This action never enrolls a learner, initiates payment or grants access.

## Scroll hand-off

The earlier content is grouped in `.catalog-underlay`. When supported, a
ResizeObserver computes `min(72px, viewportHeight - underlayHeight)` as its sticky
inset, so even a category grid taller than the screen pins at its bottom. The next
opaque, rounded catalog section stays in normal document flow with a higher layer
and naturally scrolls up over it. There is no wheel/touch interception, artificial
scroll loop or per-frame scroll handler.

IntersectionObserver makes the underlay inert only when fully covered, so keyboard
focus cannot disappear behind the catalog. During partial overlap, focusing a
control in the previous chapter scrolls the cover back enough to reveal the control;
native scrollIntoView centering alone cannot reveal a pinned child. Existing category
hit tests still verify the actual element at each action's screen coordinates.
Observers, listeners, animation frames and pending requests are cleaned up on navigation. Resizing and changing category content recompute the
inset. With reduced-motion preference (or unsupported observers) the preceding
content scrolls normally. Card hover uses small transforms; reduced motion disables
these transitions. Directional SVG controls follow AR/EN direction.

Workspace styling is split from the older Programs styles rather than raising the
existing Angular component style budgets. Noto Kufi Arabic and dark/light tokens
continue to apply. No schema changes, database seeds or new runtime dependencies.

## Verification

- `npm test -- --watch=false`
- `npx playwright test e2e/geometric-course-cards.spec.ts`
- `npm run build`

Browser design fixtures are explicitly mocked in the test file only; they are not
public catalog content. Tests cover AR/EN, 320–1440px, dark/light, actual sticky
geometry and overlay motion, keyboard bookmarks and persistence, query continuity,
error/empty/retry, pagination, image fallbacks, and reduced motion. The full browser
suite also protects category geometry, menu synchronization, videos and workflows.
