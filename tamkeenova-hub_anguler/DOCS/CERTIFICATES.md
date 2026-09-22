# Certificate studio — 2026.3

## One issue, two language editions

The administrator enters **Arabic and English recipient names**, **Arabic and English program names for training**, hours/date, **one signature name**, and optional partner logos. A single issue request creates **one certificate record with two renderable editions**. They share ownership, verification code, date, hours, partner snapshots, signature and revocation status.

The editor's language switch changes the **preview only**. It does not decide which language the recipient receives. Both language versions are validated and pre-rendered before the single API request; overflow in the non-preview language also blocks issuance. Names are entered explicitly, never automatically translated or copied into a missing language.

- **TRAINING** → Training / completion certificate, Arabic and English.
- **VOLUNTEER** → **Experience certificate**, Arabic and English. This is the existing backend enum, not a new role/type.
- Recipients at `/portal/certificates` have separate **Arabic PDF / PNG and English PDF / PNG** download buttons on one record.
- The administrator's PDF download contains **two A4 landscape pages**, Arabic then English. One download avoids browser multiple-download blocking.
- The issuance email links to the recipient's certificates and explains that both editions are available. Verification uses `/verify?code=...`.

## Reference-inspired design

The collection uses a navy engraved border, flowing gold ribbons, warm ivory paper, subtle laurels, centered Tamkeenova branding, and formal serif/Arabic typography. It follows the supplied visual reference's composition without copying another organization's logo, named officers, accreditation claims or personal handwriting.

`public/certificates/{training|experience}-{ar|en}-v3.jpg` contains complete **3508 × 2481** fixed artwork. The `-partners.jpg` variant includes the fixed collaboration label at the bottom; the normal variant has a motto instead. `-thumb.jpg` files are 900px gallery previews. JPEG at quality 96 keeps the textured print artwork compact; the runtime compositor exports lossless high-resolution PNG and PDF with a quality-97 JPEG image per page. This keeps textured two-page PDFs compact instead of embedding 50+ MB of uncompressed pixels; QR decoding is tested from the actual embedded PDF image.

- `scripts/build-certificate-artwork-v3.mjs` builds artwork offline from SVG masters, bundled OFL fonts and the committed border source.
- `ornate-v3-background.jpg` is the AI-generated, text-free ornamental border. All wording and branding are typeset deterministically at build time.
- SVG masters reference the border in the same directory; the builder embeds it for rasterization.
- Run `npm run certificates:artwork` to build **only 2026.3**. Do not overwrite issued versions in routine releases.
- Fixed text, labels, logo and decorations are flattened into artwork. Runtime paints only recipient, program, hours, date, certificate code, QR, **one signature name**, and selected partner images.

### Signature

The field is labelled **“أدخل اسم التوقيع / Enter signature name”**. One shared name is saved for both editions and rendered into one reserved signature rectangle. Latin names use the bundled Mrs Saint Delafield cursive font; Arabic names use Amiri calligraphy. Text shrinks within bounded limits and never silently truncates.

This is **decorative signature lettering**, not a scanned handwritten signature, cryptographic digital signature or a claim that a named person personally signed. There are no prefilled real-person signatures and no second signature field. The editor clearly explains the distinction.

## Trainees in the frontend; existing roles in the backend

All Arabic/English UI dictionaries now present the former role as **متدرب / Trainee**, including registration, navigation, role selectors, dashboard, tasks, approvals, status, errors and notifications. The experience certificate is labelled **شهادة خبرة / Experience certificate**. Backend-generated notification wording is adapted for display only.

Canonical frontend URLs:

- `/register/trainee`
- `/portal/trainee` and its existing status/tasks/notifications children
- `/portal/admin/trainees`

Old frontend URLs redirect to their equivalents so existing links still work. **API URLs, `VOLUNTEER` roles/enums, payload identifiers, tables, permissions and approval workflows are unchanged.** In particular, registration still calls the existing `/auth/register/volunteer` API and profile/status calls still use `/volunteers`.

## Storage — no new database schema changes in this follow-up

Version 2026.3 adds **no Prisma columns, SQL migration, role conversion or data backfill** relative to 2026.2. It uses existing certificate fields:

- `recipient_name` / `program_name`: Arabic canonical snapshots for existing integrations.
- `title_ar` / `title_en`: language-specific list titles; experience titles are fixed localized descriptions.
- `description`: a versioned JSON string with `schema: "tamkeenova.certificate/2026.3"`, `recipient_name_ar`, `recipient_name_en`, `program_name_ar`, `program_name_en`, and `signature_name`.
- `template_version`: `2026.3`; `certificate_language: "ar"` is only the canonical/default preview language, **not a restriction to Arabic**.
- Existing `partner_logos`: bounded immutable image snapshots.

No new-language or signature keys are passed to Prisma as columns. Only trusted, version-matched metadata is read; old free-text descriptions are never reinterpreted as the new envelope. Public verification does not display the internal JSON description; it exposes available languages and recipient-name snapshots instead. Authenticated certificate consumers must preserve `description` for rendering.

Existing **2026.1** bilingual and **2026.2** single-language records keep their original artwork/downloads. They are not silently changed or assigned invented translations/signatures. Explicit upgrading requires both language versions and a signature name, retaining the code, ownership and revocation status. Unknown/NULL versions still require review.

**Deployment context:** this follow-up requires no additional migration on a 2026.2 deployment. If deploying the entire rebuild PR from the original pre-rebuild database, its earlier additive `prisma/rebuild-certificates.sql` remains the prerequisite for the previously introduced certificate fields. No database migration has been run in this sandbox, and no role/table renaming is required.

## API contract

`POST /api/admin/certificates` (ADMIN / SUPER_ADMIN):

```json
{
  "user_id": "recipient-account-uuid",
  "certificate_type": "TRAINING",
  "recipient_name_ar": "ليلى أحمد محمد",
  "recipient_name_en": "Layla Ahmed Mohamed",
  "program_name_ar": "القيادة والتطوير المهني",
  "program_name_en": "Leadership and Professional Development",
  "signature_name": "Ahmed Hassan",
  "training_hours": 48,
  "issued_at": "2026-09-22",
  "partner_logos": []
}
```

For an **experience certificate**, keep `certificate_type: "VOLUNTEER"` and omit/clear both program names. Both recipient names and one signature are required for every new issue. Signature ≤80 characters; each name ≤120; each program ≤180; hours integer 1–100,000; valid date 1900–2100. Control/bidi-override characters are rejected. Dates are stored as UTC date-only values and displayed consistently; Arabic certificates use Arabic numerals.

`PATCH /api/admin/certificates/:id` validates partial changes against the saved envelope. Omission preserves the other language, signature and partner images. Null is not valid for required names/signature. Changing training to experience requires clearing **both** program names. Account ownership, version, verification code, validity, raw metadata and arbitrary fixed content are not editable request fields. `certificate_language` and old single-name/program fields are compatibility-only; they cannot replace the required bilingual values in new requests.

`partner_logos` accepts up to four `{name, data_url, source_id?}` normalized PNG snapshots. Omitted logos preserve images on PATCH; `[]` clears; `null` is invalid. Names ≤80 chars, data URLs ≤90,000 chars, decoded PNG ≤512 × 256. Optional source ID is a registered-partner UUID; direct uploads need none.

## Exact rectangles

Logical artboard: **1800 × 1273**, top-left origin. All preview/export content uses the same manifest in `src/core/certificates/certificate-template.ts`.

| Field | English X | Y | Width × height | Font / minimum | Lines |
|---|---:|---:|---:|---:|---:|
| Recipient | 340 | 470 | 1120 × 118 | 74 / 30 | 2 |
| Program (training only) | 390 | 653 | 1020 × 90 | 44 / 25 | 2 |
| Date | 370 | 858 | 300 × 66 | 31 / 23 | 1 |
| Hours | 760 | 858 | 220 × 66 | 36 / 25 | 1 |
| Certificate code | 1080 | 858 | 350 × 66 | 23 / 16 | 1 |
| Signature | 585 | 941 | 630 × 128 | 88 / 36 | 1 |
| QR | 1240 | 949 | 142 × 142 | — | — |
| Bottom partners | 530 | 1152 | 740 × 64 | — | — |

Arabic mirrors the date, hours, certificate code and QR using `x = 1800 - x - width`; centered name/program/signature/partner rectangles are unchanged. Text/images remain upright. First-selected partner appears first in reading order. Partner slots are centered, contained, and never overlap the signature or QR.

## Image and rendering safety

Administrators select registered partners or upload PNG/JPEG/WebP files ≤2 MiB each, maximum four. Browser imports use bounded 10-second CORS requests without credentials. Transparent outer padding is normalized with a bounded probe and safety margin; opaque backgrounds and aspect ratio are retained. Snapshots, not mutable library URLs, are saved.

API validation checks PNG signature, dimensions **before decompression**, CRC/content, count and size, and canonical re-encoding strips metadata. Duplicate images are rejected. SVG/remote image URLs are not accepted by the API; it never fetches arbitrary image URLs. The JSON body limit is 1 MiB. Failed imports prevent saving until retried or explicitly skipped.

QRs are generated locally with a four-module quiet zone and point to the frontend's `/verify?code=...` route. Download production credentials from the production frontend, not a temporary preview host. Required fonts are self-hosted and loaded before layout; overflow and corrupt/missing artwork stop issue/export instead of creating incomplete documents.

## Validation and deployment

```sh
cd tamkeenova-hub_anguler
npm ci
npm run test:certificates
npm run certificates:artwork  # deliberate artwork development only
npm run build
npm start -- --host 0.0.0.0
# In another terminal, with Chromium installed:
npm run test:certificates:e2e

cd ../tamkeenova-api
npm ci
npm run test:certificates
npm run build
```

Deploy frontend and API together because new issuance requires bilingual fields. Normal Prisma/database configuration is required. Browser tests use intercepted HTTP fixtures; API tests use mocked repositories. **Live database-backed issuance still needs deployment-environment verification.**

Coverage includes paired payloads, partial edits, one signature, saved language snapshots, both recipient formats, a two-page admin PDF, overflow in either language, partner safety/ordering/persistence, QR decoding, geometry and unchanged pixels outside approved regions, RTL/mobile, legacy editions, and trainee URLs/labels with unchanged backend identifiers.

`DOCS/certificate-design-preview.png` shows all four new artworks with illustrative names, signature and partner placement. These samples are not issued credentials or claims of partner endorsement.
