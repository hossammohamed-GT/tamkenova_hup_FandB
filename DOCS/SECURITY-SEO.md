# Security, SEO and source cleanup

Validated locally on 2026-10-17. This is application hardening, not a production penetration-test certificate or a guarantee that the deployed infrastructure is secure.

## Security changes

- Access-token guards explicitly accept HS256 only, require an expiry, a bounded string subject and a nonnegative integer token version, and recheck the current database user, verification/status and authorization information. Payment quotes also explicitly restrict verification to HS256 and retain their separate issuer/audience checks.
- Production startup rejects missing JWT secrets or secrets shorter than 32 bytes. A separately configured OTP pepper must also contain at least 32 bytes. Configure genuinely random secrets, not predictable strings that merely pass the length check.
- OTP matching accepts hashed six-digit codes only, uses constant-time comparison, and consumes codes with a conditional database update so concurrent requests cannot reuse one code. Existing plaintext OTPs must be resent after deployment. Failed-login counts now use an atomic database increment inside a transaction before applying account lockout.
- A recursive response filter removes password hashes, stored OTPs, token versions and lockout internals, while preserving intentional login access tokens and normal Date/Decimal serialization. Public trainer and review queries explicitly select public fields instead of exposing entire records or private application/approval data.
- Log records redact nested credentials, bearer values, database connection strings, sensitive query values and configured secrets. Exception endpoints are logged without query strings.
- API no-store/noindex middleware runs before CORS, parsing and authorization, including denied/error responses. Helmet disables embedding and active API content; Express identification is disabled. CORS allows exact configured origins, excludes development origins in production, and does not enable credentialed cookies. JSON and form body limits remain enforced.
- Upload validation checks actual buffer length, MIME type and basic file signatures; generated storage names do not trust supplied filenames. SVG/HTML payloads and unsupported files are rejected. These checks are not antivirus scanning or comprehensive image/document decoding.
- Nodemailer cannot fetch local files or remote URL attachments. Unused mailer/deployment dependencies were removed and vulnerable runtime dependencies remediated. A narrowly scoped Prisma config dependency override is used rather than an unrelated Prisma major upgrade.
- A dormant, unregistered development storage-upload controller/module was removed to prevent accidental future exposure.
- The Angular interceptor attaches tokens and processes authentication failures only for the configured API origin and path boundary. Translation files, assets, protocol-relative hostile URLs and external HTTP requests do not receive bearer credentials or trigger unrelated logout behavior.
- Frontend CSP rejects inline scripts, plugin objects, foreign base URLs and foreign form destinations while retaining supported YouTube embeds and existing remote resources. Vercel configuration adds response security headers, anti-framing and private-route no-store/noindex headers. It intentionally adds no deployment rewrites.

## SEO changes

- Canonical, organization, breadcrumb and structured-data URLs use the existing public site origin, not the current preview host. Canonicals are unique and omit query strings, fragments and redundant trailing slashes.
- Child-route metadata takes precedence over public parent metadata. Private routes, preview origins, loading and missing resources are not indexable. Navigation clears stale resource metadata and schemas without erasing metadata supplied by the newly activated component.
- Loaded course data supplies translated titles/descriptions and Course structured data; trainer profiles retain Person structured data without unsupported Person aggregate ratings. Empty or failed resources clear their page schema.
- JSON-LD IDs are bounded, serialization escapes less-than characters, unsafe URL schemes are rejected, and sharing metadata has an absolute default image URL. HTML language/direction and sharing locale follow the selected language.
- Robots exclusions cover account, portal, API and checkout routes; the sitemap no longer advertises invented modification dates.

The app is still an Angular client-rendered SPA. Google can render JavaScript, but social crawlers that do not execute it will generally see the static site-wide sharing metadata rather than course-specific metadata. Per-resource server-rendered metadata, true HTTP 404 responses for missing public resources, and an automatically generated sitemap for published courses/trainers remain follow-up deployment work. Arabic and English currently share URLs; no misleading language-specific hreflang URLs were invented.

## Comment removal

Removed 839 source/configuration comments. Dependency directories, generated outputs, binary/font assets and required license texts are excluded. A repeatable checker is available from the repository root after installing frontend dependencies:

```sh
node scripts/code-comments.mjs
```

The optional `--write` mode removes comments. TypeScript/JavaScript use AST-associated comment ranges and an executable-syntax comparison; CSS uses PostCSS nodes; HTML uses Angular comment nodes; SQL/Prisma scanning preserves quoted and dollar-quoted content. The tool also checks XML/SVG comments and project ignore/editor configuration comments. Built-in fixtures check that URLs, regexes, literal comment-looking strings and HTML attributes survive. The final check reports zero remaining source/configuration comments.

## Validation

| Check | Result |
| --- | --- |
| Angular unit tests, including new SEO/interceptor cases | 184 passed / 24 suites |
| Playwright full browser suite, including course/trainer SEO | 173 passed |
| API JWT, roles, serialization, configuration, upload, log and OTP/counter security tests | 17 passed / 3 suites |
| Trainer API tests | 20 passed |
| Course/category/workflow API tests | 90 passed |
| Certificate API tests | 85 passed |
| Logger deployment/redaction tests | 8 passed |
| Runtime compatibility tests | 4 passed |
| Embedded PostgreSQL workflow/schema tests | 2 passed |
| Video/demo schema tests | 4 passed |
| Demo retirement/catalog tests | 17 passed |
| Angular production build | Passed; existing bundle/CommonJS warnings remain |
| API Nest build; Prisma client generation with `--no-engine` | Passed; no live query engine/database exercised |
| API lint | 0 errors; 8 pre-existing unused-import/variable warnings |
| Comment checker and Git whitespace check | Passed |

The compiled API bootstrap was exercised with production configuration, a read-only-filesystem simulation and mocked database/storage providers. HTTP assertions verified health, denied unauthorized admin access, allowed the exact public origin, rejected foreign/local development origins, checked security/no-store/noindex headers on success and failure, and checked that query tokens are absent from logs. This does not connect to the production database or Supabase.

Dependency audit results at validation time:

- Frontend, including development dependencies: **0 known vulnerabilities**.
- API production dependencies (`npm audit --omit=dev`): **0 known vulnerabilities**.
- API including development tooling: **20 moderate advisories**, all in the unpatched `sprintf-js` chain used by Jest tooling. No high/critical advisories remain. No forced downgrade or misleading suppression was applied; review this again when upstream publishes a compatible fix.

## Production checklist and remaining boundaries

1. Deploy both applications from the updated branch. Confirm Vercel uses the frontend project directory so its header configuration is applied. Existing routing/proxy settings are not changed. Verify actual HTTPS responses, cache behavior and private-route headers at the public edge; development preview responses do not prove Vercel header delivery.
2. Use private environment configuration for random JWT/OTP secrets, database credentials, Supabase service credentials and mail credentials. Rotate any previously exposed credentials. Keep the current Prisma schema/migrations consistent with the database using the established reviewed, non-destructive deployment process; no live database migration/reset was performed here.
3. If changing the public domain, update `SEO_PUBLIC_ORIGIN`, static index sharing/canonical URLs, robots/sitemap URLs and the API CORS origin together. Set additional `FRONTEND_ORIGINS` to exact trusted origins only.
4. Audit Supabase bucket policies and object access. Application documents, attachments and payment evidence may contain private data: signature validation and random filenames do not make a public bucket private. Review least-privilege keys, private buckets/signed-download authorization, malware scanning, retention and backups against the actual deployment.
5. Existing throttling is process-local. A multi-instance/serverless deployment needs shared rate-limit storage or edge/WAF enforcement for robust distributed abuse prevention. Monitor OTP/login and upload abuse.
6. The frontend retains its existing local-storage bearer-token architecture. API destination scoping and CSP reduce exposure but do not make browser storage immune to a successful same-origin XSS attack; an HttpOnly-cookie architecture would require a separate session/CSRF design.
7. Run live smoke tests for database connectivity, production authentication/OTP mail, real uploads, trainer approval, manual payment verification, authorized lesson access, completion and certificates. They were not exercised against real accounts or services in this workspace.
8. Re-run dependency audits in CI and monitor deployment logs/alerts. An audit result is a dated advisory inventory, not a proof that all application vulnerabilities have been eliminated.
