# TamkeenovaHubAnguler


## Production API connection

The browser uses the same-origin `/api` base. On Vercel, this project's `vercel.json` rewrites it to `https://tamkeenova-api.vercel.app/api` before the Angular SPA fallback. `proxy.conf.json` is development-only and is not deployed as a production proxy.

Set the frontend Vercel Root Directory to `tamkeenova-hub_anguler`, deploy the updated configuration, and run `npm run test:deployment` to check the routing contract. See [production diagnosis and deployment checks](../DOCS/PRODUCTION-CONNECTION.md).


This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Embedded video and logical action controls

Course introduction/lesson playback remains inside the shared YouTube player. The HTML CSP
explicitly allows `frame-src https://www.youtube-nocookie.com https://www.youtube.com`;
URL validation and all other CSP restrictions remain in place. If the hosting platform also
sends a **Content-Security-Policy response header**, its `frame-src` must permit these hosts
too: an HTML policy cannot override a stricter response header. Do not use `frame-src *`.
The external YouTube link is an optional fallback, not the normal lesson flow. YouTube still
controls video availability, age/region restrictions and whether an owner permits embedding.

Horizontal navigation uses `.directional-arrow` with a right-facing source glyph for
`.arrow-forward` and a left-facing glyph for `.arrow-back`. RTL mirrors either once via the
individual CSS `scale` property, independently of hover transforms. Do not also rotate these
icons in a component. Local text/SVG arrows work even when the external icon font is blocked.
Physical fullscreen/download/external-link and vertical reorder icons are not navigation arrows.

Shared action groups use `--action-gap` (12px; compact table action groups 8px), wrap when
needed, and have explicit separation from stacked form controls. Avoid blanket button margins:
they break inline search, chat and icon-only controls. Workflow/player controls retain at least
44px targets. Browser regressions cover Arabic/English at 320–1440px, hover/language changes,
admin dialogs/pagination, actual **mock embedded-document loading under CSP**, and rejection
of unrelated frame hosts. These tests do not establish live YouTube playback or owner permission.

## Course category administration

Admins/super-admins have **Course categories / تصنيفات الكورسات** in the admin navigation at
`/portal/admin/course-categories`. They can add/edit bilingual names and descriptions, category
slugs, images (HTTPS/local URL or JPG/PNG/WEBP upload up to 5MB), parent categories, ordering
and visibility. Only unreferenced categories can be deleted, after confirmation. The native
confirmation dialog traps focus and supports Escape/cancel; a conflict closes it and shows the
server's actionable error without deleting the record. Hiding a parent hides its children from
navigation while retaining all courses/enrollments. Public menus update after saves without
reloading; category display order is respected, and new categories use the existing SVG artwork.

Admin/super-admin course pages show management instead of purchase/enrollment. Direct learner
checkout/library links revalidate the session role and redirect to `/portal/admin/course-workflow`;
trainers continue to their authoring studio. The backend independently enforces this separation.
Live image uploads require the existing API Supabase storage configuration; browser tests use
explicit local API fixtures, not live category insertion or real storage writes.
