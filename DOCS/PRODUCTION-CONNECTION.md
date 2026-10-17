# Production frontend → API routing

## Diagnosed on 2026-10-17

Public read-only checks against the deployed services showed:

- `https://tamkeenova-api.vercel.app/api/health` returned `{"success":true,"status":"ok"}`.
- `https://tamkeenova-api.vercel.app/api/courses/categories` returned JSON with nine categories.
- `https://tamkeenova-api.vercel.app/api/courses?limit=1` returned a published course.
- `https://tamkeenova-hub.vercel.app/api/courses/categories` returned the frontend's Arabic not-found page rather than the API JSON.

The failure is the deployed frontend API route, not missing category rows. Angular correctly calls the same-origin `/api` base, but Angular CLI's `proxy.conf.json` runs only during `ng serve`; it is not a production proxy. The frontend Vercel configuration had security headers but no API rewrite. No database data, categories, credentials or permissions were changed for this fix.

## Fix

The frontend's `tamkeenova-hub_anguler/vercel.json` now routes:

| Incoming frontend request | Destination |
| --- | --- |
| `/api/courses/categories` | `https://tamkeenova-api.vercel.app/api/courses/categories` |
| `/api/courses?page=2&limit=12` | `https://tamkeenova-api.vercel.app/api/courses?page=2&limit=12` |
| `/api/auth/login` | `https://tamkeenova-api.vercel.app/api/auth/login` |
| `/api/admin/course-categories` | `https://tamkeenova-api.vercel.app/api/admin/course-categories` |
| Non-file Angular routes such as `/programs` and `/team/instructor-slug` | `/index.html` |

The API rewrite is first; the Angular catch-all is last. These are rewrites, not browser redirects, so the browser keeps its own origin and the existing bearer-token boundary. Vercel handles normal static assets through its filesystem routing. API status codes, request methods, query parameters, bodies and authorization headers must continue through the proxy; API errors must not be replaced with the SPA index.

API responses additionally receive frontend-edge `private, no-store` and `noindex, nofollow, noarchive` headers. Existing security headers and the backend's authorization and exact-origin CORS rules stay intact. Development continues to use the local CLI proxy to port 3000; no browser request is pointed to sandbox localhost or directly to a different backend origin.

## Deploy

1. Deploy the updated frontend commit from `arena/048f3186-tamkenova-hup-fandb`.
2. In the frontend Vercel project, set **Root Directory** to `tamkeenova-hub_anguler` so Vercel reads that directory's `vercel.json`. Use the Angular framework preset and the project's production build. If an output directory is explicitly configured, it is `dist/tamkeenova-hub_anguler/browser`.
3. Confirm no older dashboard routing settings override the checked-in API rewrite. Redeploy the frontend after configuration changes. This fix does not require changing backend code or the database.
4. Verify these URLs on the deployed frontend, not just directly on the backend:

```sh
curl -i https://tamkeenova-hub.vercel.app/api/health
curl -i https://tamkeenova-hub.vercel.app/api/courses/categories
curl -i 'https://tamkeenova-hub.vercel.app/api/courses?page=1&limit=1'
curl -i https://tamkeenova-hub.vercel.app/api/admin/course-categories
```

The first three should return JSON, not `<!doctype html>` or the Angular not-found page. The unauthenticated admin request should remain **401**, not become an HTML success page. Check API cache/indexing headers and a hard refresh on `/programs`. Then verify login and authorized actions using real accounts in your own browser; no production credentials or authenticated mutations were used in this diagnosis.

For a custom frontend domain, replace the frontend hostname in these checks and add that exact origin to the backend's trusted `FRONTEND_ORIGINS` environment variable if needed, then redeploy the backend. Do not use wildcard CORS or disable production secret checks to solve a missing frontend rewrite. Preview hosts may likewise need an explicitly trusted origin for requests that carry an Origin header.

## Regression checks

```sh
cd tamkeenova-hub_anguler
npm run test:deployment
npm test -- --watch=false
npm run build
```

The dependency-free deployment contract tests cover API destination/order, SPA fallback, API cache/indexing headers, preserved relative environments, development proxy and CSP. The new configuration was also compiled using Vercel's routing utilities, with API-path/query routing and SPA/static handling checked locally. That is configuration validation, not a claim that the public deployment has already been updated: the final frontend-domain checks must be repeated after the new deployment.
