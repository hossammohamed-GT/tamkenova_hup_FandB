# Certificate studio — 2026.2

## Four independent editions

The current collection contains **training / Arabic, training / English, volunteer / Arabic, and volunteer / English**. Certificate language is chosen by the administrator and saved independently of the website language. Names/program names are entered in the intended language, never automatically translated.

Arabic has a genuine mirrored RTL composition, Arabic fixed copy, Arabic numerals, an Amiri title/signature and a right-hand brand rail on training certificates. English has its own English-only fixed copy and left-to-right layout. Training uses a navy brand rail and gold medallion; volunteer recognition uses an open ivory composition, corner ribbons and a medallion. Both keep the official Tamkeenova mark and navy/gold identity.

### Immutable artwork

- `public/certificates/{training|volunteer}-{ar|en}-v2.png`: complete 3508 × 2481 print artwork without partners.
- `*-v2-partners.png`: the same composition with the **fixed** partner-band heading baked into the image, replacing the footer motto. Used automatically only when logos are selected; an empty certificate never displays a misleading empty “partners” heading.
- `*-v2-thumb.png`: 900px thumbnails, not additional selectable templates.
- `*-v2.svg`: build-time masters, not the runtime compositor.
- `scripts/build-certificate-artwork-v2.mjs`: offline deterministic builder (`npm run certificates:artwork`). Uses bundled OFL fonts and `@resvg/resvg-js`.

Titles, descriptions, organization logo, signature, decorative frames, medallion, labels and footer wording are permanently flattened into the PNG. Runtime rendering inserts only the approved certificate values **plus administrator-selected partner images**, as requested for this edition. No fixed wording is generated at runtime.

The signature is a fixed **institutional typographic endorsement** (“Tamkeenova” / “إدارة تمكينوفا”), not an invented officer's handwriting or an accreditation claim. Any future personal signature must be supplied/approved by the organization and baked into a new artwork version.

## Partner selection and safety

Administrators can choose **up to four logos**, in any combination:

1. Select an active registered partner from the existing partner library.
2. Upload PNG, JPEG or WebP files directly from their device (maximum 2 MiB each).
3. Reorder or remove logos before saving. The first selected logo appears first in reading order: rightmost in Arabic, leftmost in English.

The preview, PDF and PNG share the same compositor. Logos are centered in an isolated footer band, keep their aspect ratios and never overlap the signature, date or QR. Fully transparent outer padding is trimmed with a safety margin; visible logo content is never cropped or stretched. Opaque backgrounds are retained.

### Image snapshots, not mutable URLs

Images are normalized in the browser into small raster PNG snapshots, no larger than 512 × 256 and 90,000 data-URL characters each. These snapshots are saved in `partner_logos` on the certificate. Future library edits/deletions, expiring image URLs or a user's website language changes cannot alter an issued document.

The API independently validates the count, name, data-URL format, PNG signature, dimensions **before decompression**, CRC/content and size. It re-encodes to remove metadata, rejects duplicate image bytes and stores the normalized snapshots. SVG and remote URLs are never accepted as API image payloads. The backend never fetches arbitrary image URLs, avoiding server-side URL-fetch/SSRF risks. JSON request bodies are bounded at 1 MiB (four maximum-size snapshots fit comfortably).

The optional `source_id` records the registered partner UUID as provenance metadata. It is not a live logo reference or an authorization token; directly uploaded logos need no library record.

Registered-logo imports are browser-side, bounded CORS fetches with a ten-second timeout and no credentials. If the image host disallows CORS or uses an unsupported source format, the admin sees an error and can upload a raster file instead. Failed selections never silently disappear into an issued certificate: issuance is disabled until retry succeeds or the admin explicitly skips that image. Library outages do not block direct uploads or existing snapshots.

## Exact field positions

The logical artboard is **1800 × 1273**, measured from the upper-left. Preview and export scale the whole artboard together. These are the **English edition** rectangles:

| Field | Training X | Volunteer X | Y | Width | Height | Font / minimum | Lines |
|---|---:|---:|---:|---:|---:|---:|---:|
| Recipient | 405 | 220 | 467 | 1260 training / 1360 volunteer | 120 | 64 / 30 | 2 |
| Program | 425 | — | 671 | 1220 | 105 | 40 / 24 | 2 |
| Hours | 435 | 305 | 887 | 240 | 70 | 44 / 26 | 1 |
| Date | 750 | 600 | 887 | 310 | 70 | 33 / 25 | 1 |
| QR | 1465 | 1385 | 868 | 164 | 164 | — | — |
| Partner band | 440 | 305 | 1131 | 1190 | 82 | — | — |

For Arabic, **`x = 1800 - English x - width`**. Y/dimensions are unchanged. Text and logos stay upright; only their positioning is mirrored.

`src/core/certificates/certificate-template.ts` is the authoritative manifest. `partnerSlots()` calculates a centered row of 0–4 slots, maximum width 230, with 40-unit gaps and the template's reading order. Each logo is contained within its slot.

Names/programs wrap at word boundaries and shrink within fixed limits. Unfittable values cause a visible error rather than truncation or overlap. Arabic/Latin fonts are explicitly loaded before rendering. Dates are stored as timezone-independent `YYYY-MM-DD`; Arabic artwork renders Arabic numerals. Hours are integers 1–100,000; recipient names up to 120 characters; training program names up to 180. Control characters and bidi override controls are rejected in certificate text.

## Workflow and exports

- Admin: `/portal/admin/certificates`, four template cards and separate type/language selectors in the editor.
- Enter recipient account, display-name snapshot, training program (training only), hours/date and optional partners.
- Preview placeholders are clearly identified as examples. Final QR codes are assigned on issue.
- Save pre-renders before calling the API; the server validates independently and assigns a cryptographically random verification code and template version.
- Admin PDF downloads and recipient PDF/PNG downloads use the same high-resolution image. PDF is A4 landscape.
- `/portal/certificates` is available to authenticated recipients, including volunteers via their dashboard. The JWT-protected API retrieves only the authenticated user's records.
- Download filenames include certificate type, saved language and verification code for the new editions.
- QR codes are generated locally, with a four-module quiet zone, pointing to `{frontend-origin}/verify?code=...`. Download production certificates from the production frontend, not a temporary preview hostname.
- Revocation and deletion remain separate administrator-only operations. Editing content cannot change account ownership, verification code or revocation state.

## API contract

`POST /api/admin/certificates` (ADMIN / SUPER_ADMIN):

```json
{
  "user_id": "recipient-account-uuid",
  "certificate_type": "TRAINING",
  "certificate_language": "ar",
  "recipient_name": "ليلى أحمد محمد",
  "program_name": "القيادة والتطوير المهني",
  "training_hours": 48,
  "issued_at": "2026-09-22",
  "partner_logos": []
}
```

`partner_logos` may be omitted or an array of up to four `{ "name": "Partner name", "data_url": "data:image/png;base64,...", "source_id": "optional-partner-uuid" }` snapshots. The shown ellipsis is illustrative, not a valid PNG. `source_id` must be omitted for direct uploads. For `VOLUNTEER`, omit `program_name` or send `null`; a non-empty program is rejected.

`PATCH /api/admin/certificates/:id` accepts any subset of these fields except `user_id`, validating the merged record. Omitted logos preserve existing snapshots; `partner_logos: []` explicitly removes them. `null` is not an empty selection. Changing training to volunteer requires clearing `program_name`.

Custom headings/descriptions/signatures, arbitrary QR URLs, client-selected template versions and PDF uploads remain unsupported. `partner_ids` is derived compatibility metadata, not an accepted request field. `title` is derived list/notification metadata, not the certificate's fixed heading. Responses retain `{ success, message, certificate }`.

## Backward compatibility

**2026.1 certificates keep their original bilingual artwork, original field positions and original downloads.** The old assets and manifest remain immutable. They are not offered for new issuance. The previous body-signature/date/QR layout is not silently replaced on download.

An admin may explicitly upgrade a record using the new editor. The editor explains that saving adopts the selected new edition; it requires a language choice and preserves verification code/validity. A partial API edit of a 2026.1 record without explicitly supplying the new language is rejected rather than silently upgrading.

Pre-rebuild historical rows with NULL versions remain verifiable but require admin review before new-artwork export. Unsupported `OTHER` records are never rendered as training certificates by fallback.

## Deployment — rerun the additive migration

```sh
cd tamkeenova-api
npm ci
npm run db:certificates
npm run build
```

`prisma/rebuild-certificates.sql` is transactional and idempotent. It now also adds **`certificate_language varchar(2)` and `partner_logos jsonb`**. Rerun it even if the 2026.1 migration was already applied. It preserves existing rows without backfilling or changing their designs.

Deploy the new API and frontend together: language is now required for new issuance. Normal database/Prisma engine configuration is required in deployment. No live database migration has been applied in the coding sandbox.

```sh
cd tamkeenova-hub_anguler
npm ci
npm run build
npm start -- --host 0.0.0.0
```

Development uses relative `/api` requests, proxied to port 3000 by `proxy.conf.json`; production uses `environment.prod.ts`. Certificate fonts/assets are self-hosted. Keep versioned artwork/fonts for the lifetime of issued certificates. `npm run certificates:artwork` builds only the new edition; do not regenerate or overwrite frozen artwork in routine releases.

## Tests and visual review

```sh
# Frontend manifest, logo geometry, validation and monolingual fixed-copy checks
cd tamkeenova-hub_anguler
npm run test:certificates

# Browser workflow (start the frontend first; HTTP APIs are intercepted fixtures)
npx playwright install chromium
npm run test:certificates:e2e
# Optional CERTIFICATE_TEST_URL and CHROMIUM_PATH overrides.

# API DTO, PNG safety, language, issuance/update, snapshot and verification tests
cd ../tamkeenova-api
npm run test:certificates
```

Coverage includes all four editions; Arabic/RTL/mobile layout; transparent-padding normalization; registered and uploaded logos; ordering/removal/four-logo limit; corrupted/unavailable images; issue/update payloads; old-edition exports; PDF/PNG; QR decoding; and pixel checks that everything outside the permitted regions remains identical to its fixed artwork.

`DOCS/certificate-design-preview.png` shows the four current designs with illustrative data and partner placement. These are design samples, not issued credentials or claims of endorsement. Live database-backed issuance and the migration still need verification in the deployment environment.
