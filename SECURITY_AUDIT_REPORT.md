# TamkeeNova HUB — Full Security Audit Report

**Target:** `tamkeenova-api` (NestJS 12 + Prisma + PostgreSQL + Supabase) and `tamkeenova-hub_anguler` (Angular SPA)  
**Date:** 2026-09-22  
**Scope:** Entire repository (application source, configuration, auth, APIs, frontend, storage, mail)  
**Method:** Static secure-code review (attacker mindset). No live production exploitation was performed.  
**Classification:** Confidential — internal security assessment

---

## Executive Summary

TamkeeNova HUB is a multi-role training platform (students, trainers, volunteers/trainees, employees, admins) with JWT authentication, OTP email verification, Prisma ORM, and an Angular SPA.

The codebase shows several **positive** patterns: Prisma parameterized queries (low classic SQLi risk), bcrypt password hashing (cost 12 on register), NestJS `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`, class-level admin guards, enrollment/review ownership checks, and a global exception filter that strips infrastructure error details.

However, the application is **not production-ready from a security standpoint**. The highest-impact issues are:

1. **JWT is the sole session.** Role and identity are taken from the token, not re-loaded from the database. Disabled users and demoted admins remain fully privileged until the token expires. There is no revocation/denylist.
2. **Any `ADMIN` can promote any user to `SUPER_ADMIN`** (`PATCH /api/admin/users/:id/role`). There is no Super-Admin-only gate.
3. **CORS is `origin: true` with `credentials: true`**, reflecting any Origin.
4. **No rate limiting** on login, OTP, registration, or public APIs.
5. **OTPs are generated with `Math.random()`** (not CSPRNG), stored in plaintext, 6 digits, with no attempt lockout.
6. **JWT stored in `localStorage`**, no CSP, no security headers, no Helmet.
7. **Public unauthenticated catalog and profile APIs** with no bot/WAF/CAPTCHA controls — trivial to scrape.
8. **File uploads** trust client MIME type and original filenames; storage is public via Supabase public URLs.
9. **No MFA, no password-reset flow, no account lockout, no Helmet/HSTS/CSP.**

**Overall Security Score: 41 / 100**  
**Production Readiness Score: 32 / 100**  
**Security Rating: D (High risk — do not treat as production-hardened)**  
**Risk Score: 7.8 / 10 (High)**

Realistic exploitation of several High findings (brute-force OTP, credential stuffing, token reuse after disable, CORS + XSS token theft, unrestricted scraping) is **yes**, given typical deployments.

---

## Risk Score

| Dimension | Score (0–10, higher = worse) | Notes |
|-----------|------------------------------|--------|
| Authentication | 8.0 | Weak OTP, no lockout, JWT not revalidated |
| Authorization | 7.5 | Role in JWT; ADMIN→SUPER_ADMIN; student APIs not role-bound |
| Cryptography | 6.5 | bcrypt OK; Math.random OTP; JWT secret env-dependent |
| Injection | 3.0 | Prisma mitigates SQLi; XSS/HTML in stored comments possible |
| Configuration | 8.5 | CORS *, no headers, no rate limit |
| Data exposure | 7.0 | Public profiles, availability enumeration |
| Logging/monitoring | 6.0 | Winston present; no auth brute-force alerts |
| Supply chain | 4.0 | Relatively current Nest 12; no lockfile CVE scan in CI visible |
| **Composite** | **7.8** | **High** |

---

## Security Rating

| Grade | Meaning |
|-------|---------|
| **D** | Multiple High/Critical design flaws. Suitable for private beta only behind VPN/WAF after immediate fixes. |

---

## Critical Findings

### C-01 — JWT never revalidated against live user state (session immortality)

**Severity:** Critical  
**CVSS 3.1 (estimate):** 8.1 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N)  
**Files:** `tamkeenova-api/src/common/guards/jwt-auth.guard.ts`, `tamkeenova-api/src/modules/auth/strategies/jwt.strategy.ts`, `tamkeenova-api/src/modules/auth/auth.service.ts`  
**Functions:** `JwtAuthGuard.canActivate`, `JwtStrategy.validate`, `AuthService.login`

**Why vulnerable:** The guard only `jwt.verify`s the token and copies `sub`, `email`, `role` onto `request.user`. It does **not** load the user from the database. `is_active`, `email_verified`, and current `role` are ignored after login.

**Exploit:**  
1. Attacker logs in as a legitimate user (or stolen token).  
2. Admin deactivates the account (`PATCH /api/admin/users/:id/status`).  
3. Attacker continues to call all APIs until JWT expiry (`JWT_EXPIRES_IN`).  
4. Same for role demotion: a stolen ADMIN JWT remains ADMIN even after DB role change.

**Proof:**

```typescript
const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
request.user = { sub: payload.sub, email: payload.email, role: payload.role };
return true;
```

**Realistically exploitable:** Yes.

**Remediation:** On every request, load user by `sub`; reject if missing, inactive, or unverified; use DB `role` not JWT `role`. Maintain a token version / denylist on password change and deactivation.

**Secure example:**

```typescript
const user = await prisma.users.findUnique({ where: { id: payload.sub } });
if (!user || !user.is_active || !user.email_verified) {
  throw new UnauthorizedException();
}
request.user = { sub: user.id, email: user.email, role: user.role };
```

---

### C-02 — Vertical privilege escalation: ADMIN can assign SUPER_ADMIN

**Severity:** Critical  
**CVSS:** 8.8 (AV:N/AC:L/PR:H/UI:N/S:C/C:H/I:H/A:H) with compromised/malicious ADMIN  
**Files:** `tamkeenova-api/src/modules/admin/admin.controller.ts`, `admin.service.ts` (`changeUserRole`), `dto/change-role.dto.ts`  
**Functions:** `AdminController.changeUserRole`, `AdminService.changeUserRole`

**Why:** Controller is `@Roles('ADMIN', 'SUPER_ADMIN')`. DTO allows `'SUPER_ADMIN'`. Service updates role with no check that the actor is SUPER_ADMIN, and no protection of the last SUPER_ADMIN.

**Exploit:** Compromised or rogue ADMIN:

```http
PATCH /api/admin/users/<own-or-colluding-id>/role
Authorization: Bearer <admin-jwt>
{ "role": "SUPER_ADMIN" }
```

**Realistically exploitable:** Yes, if any ADMIN account is obtained (phishing, XSS + localStorage token).

**Remediation:** Only SUPER_ADMIN may assign ADMIN/SUPER_ADMIN. Prevent self-demotion of last SUPER_ADMIN. Split permissions.

---

## High Findings

### H-01 — CORS reflects any Origin with credentials

**Severity:** High  
**CVSS:** 7.1  
**File:** `tamkeenova-api/src/main.ts`  
**Function:** `bootstrap`

```typescript
app.enableCors({ origin: true, credentials: true });
```

**Exploit:** Malicious site `evil.example` makes credentialed fetch to the API. Combined with XSS or if cookies were used, this is catastrophic. Today tokens are in `Authorization` (not cookies), so browser CORS alone does not auto-send JWT — **unless** a future change stores cookies, or an XSS on a trusted origin steals localStorage. Still a severe misconfiguration and fails any compliance review.

**Remediation:** Explicit allowlist: `origin: ['https://app.tamkeenova.example']`.

---

### H-02 — No rate limiting / lockout (login, OTP, register, availability)

**Severity:** High  
**CVSS:** 7.5  
**Files:** `auth.controller.ts` (`login`, `resendOtp`, `verifyEmail`, `register`, `availability`), entire `main.ts` (no Throttler)

**Exploit:**  
- Credential stuffing against `POST /api/auth/login`.  
- OTP brute force: 6-digit space = 1e6; unthrottled HTTP can exhaust in minutes.  
- `GET /api/auth/availability?email=` enumerates accounts.  
- `POST /api/auth/resend-otp` is a mail bomb.

**OTP generation (also High crypto):**

```typescript
// otp.util.ts
return Math.floor(100000 + Math.random() * 900000).toString();
```

`Math.random()` is not cryptographically secure. OTP stored plaintext in `email_otps`.

**Remediation:** `@nestjs/throttler`; lock after N failures; `crypto.randomInt`; hash OTPs; exponential backoff; CAPTCHA on public auth.

---

### H-03 — JWT in localStorage + no CSP (XSS → full account takeover)

**Severity:** High  
**CVSS:** 8.0 (requires XSS)  
**Files:** `tamkeenova-hub_anguler/src/core/services/auth.service.ts`, `index.html`, no Helmet in API

Any XSS (stored review/comment, future `innerHTML`, third-party script) can `localStorage.getItem('token')` and replay APIs.

Frontend role routing also trusts `localStorage.user.role` (UI-only; API is source of truth — good). Still, XSS = token theft.

**Remediation:** httpOnly Secure SameSite cookies; short-lived access + rotating refresh; CSP `default-src 'self'`; Helmet.

---

### H-04 — AuthZ on student/trainer APIs is “any authenticated user”

**Severity:** High  
**CVSS:** 6.5–7.5  
**Files:** `students.controller.ts`, `trainers.controller.ts` — `JwtAuthGuard` only, no `RolesGuard`

A VOLUNTEER/EMPLOYEE JWT can hit `PATCH /api/students/profile`, enroll, upload avatars, create trainer programs (`POST /api/trainers/programs`) depending on service-layer trainer-row checks.

If `createProgram` only looks up trainer by `user.sub` and fails closed, risk is lower; if it creates rows loosely, it is IDOR/privilege. **Forced browsing of student PII endpoints** with any JWT is still excessive.

**Remediation:** `@Roles('STUDENT')` / `@Roles('TRAINER')` plus resource ownership (already partly present for enrollments).

---

### H-05 — File upload: MIME trust, original filename, public bucket

**Severity:** High  
**CVSS:** 7.2  
**Files:** `students.service.ts` `uploadAvatar`, `storage.service.ts`, `tasks.service.ts` submit, `corporate-requests.service.ts`, `FileInterceptor` without `fileFilter`/limits in controllers

Checks `file.mimetype` (attacker-controlled). `file.originalname` concatenated into storage path. `upsert: true`. Public URL via `getPublicUrl`. Multer default memory store — large files = DoS (avatar has 5MB check after upload into memory).

**Exploit:** Upload `shell.php.jpg` or SVG with script if MIME spoofed; stored XSS if content served with wrong Content-Type; path weirdness in originalname (`../../`).

**Remediation:** Magic-byte inspection; allowlist extensions; generate UUID names; virus scan; private buckets + signed URLs; Multer limits in interceptor.

---

### H-06 — Account enumeration

**Severity:** High (privacy / credential stuffing aid)  
**CVSS:** 5.3–6.5  
**Files:** `auth.service.ts` `register`, `resendOtp`, `checkAvailability`; `auth.controller.ts` `GET availability`

Distinct messages: “Email already exists”, “User not found”, availability booleans.

**Remediation:** Uniform responses; auth-gated or captcha-gated availability.

---

### H-07 — Email change without re-verification

**Severity:** High  
**File:** `students.service.ts` `updateContactInfo`

Attacker with a stolen session changes victim email, then password, locking the victim out and taking the account.

**Remediation:** Confirm via OTP on old and new email; invalidate sessions.

---

### H-08 — Weak password policy & no MFA

**Severity:** High (policy)  
**File:** `register.dto.ts` `@MinLength(8)` only

No complexity, no breach check, no MFA for ADMIN.

---

### H-09 — No password reset; no token rotation on password change

**Severity:** High  
**Files:** no reset module; `changePassword` does not bump token version

Stolen JWT remains valid after password change.

---

## Medium Findings

### M-01 — Missing security headers (CSP, HSTS, X-Frame-Options, nosniff)

`main.ts` has no Helmet. Angular `index.html` has no CSP meta. Clickjacking of login/portal is possible.

### M-02 — Partners admin DTO is `any` (mass assignment)

`partners.controller.ts`: `create(@Body() dto: any)`. Combined with ValidationPipe whitelist at global level, **untyped bodies may still pass unexpected fields if no DTO class**. `forbidNonWhitelisted` without a class does not strip unknown keys the same way.

### M-03 — Global exception filter swallows useful errors but also all `HttpException` messages

Clients always get generic `REQUEST_FAILED`. Security-positive for leakage; operationally may hide auth failures. Status codes still enumerate (401 vs 400).

### M-04 — Test storage endpoint exists (not mounted)

`test.controller.ts` `GET /test/upload` uses `SUPABASE_SECRET_KEY`. `TestModule` is imported in `app.module.ts` **source** but **not** listed in `@Module({ imports })` — currently inert. If someone adds `TestModule` to imports, it becomes an unauthenticated storage write + error disclosure.

### M-05 — Gmail SMTP credentials as app password in env

`mail.service.ts` uses `MAIL_USER` / `MAIL_PASSWORD`. Misconfiguration or log leak = mailbox takeover and OTP interception.

### M-06 — Public trainer/program/verify APIs — scraping

Unauthenticated: `GET /api/trainers`, `GET /api/trainers/profile/:slug`, `GET /api/trainers/programs/all`, `GET /api/students/u/:username`, `GET /api/verify/user/:username`, `GET /api/verify/certificate/:code`, `GET /api/partners`.

### M-07 — Trainer documents as attacker-supplied URLs

`RegisterDto` `documents[].file_url` `@IsUrl()` — can point to internal IPs (limited SSRF if server fetches; here stored and later rendered — stored XSS / phishing).

### M-08 — Insecure randomness for trainer slugs

`dto.username + '-' + Math.floor(Math.random() * 100000)` — predictable slugs, collision risk.

### M-09 — bcrypt cost inconsistency

Register: cost 12 (`bcrypt`). Change password: `bcryptjs` `genSalt(10)`. Dual libraries.

### M-10 — Consultation emails leak student phone, WhatsApp, bio, certificates to trainer (business-acceptable) without consent flags.

### M-11 — `findFirstAdmin` only `role: 'ADMIN'` not `SUPER_ADMIN` — notifications/mail may never reach SUPER_ADMIN-only deployments.

### M-12 — No CSRF tokens

Bearer-from-header is generally CSRF-safe. If migrated to cookies without SameSite, CSRF appears.

### M-13 — Frontend admin UI route on trainer portal

`portal/trainer/partners` loads `AdminPartnersComponent`. API still role-gated; UI confusion / IDOR attempts.

### M-14 — Winston may log IPs and exception objects (PII / tokens if ever attached).

### M-15 — Certificate verification codes enumerable if short; admin uses 8 random bytes (OK); students helper uses 4 bytes (`TAM-` + 8 hex) — 32-bit, brute-forceable without rate limit.

---

## Low Findings

- Health endpoints disclose app name/version (`AppController`).
- No `SameSite` discussion; JWT not cookies today.
- Duplicate OTP repositories (`auth.repository.ts` vs `repositories/auth.repository.ts`).
- `JwtStrategy` unused by `JwtAuthGuard` (custom verify) — two JWT stacks.
- Angular roleGuard is UX only.
- Font Awesome / Google Fonts third-party (privacy, supply chain); Font Awesome has SRI.
- `upsert: true` on storage can overwrite same millisecond+name.
- No dependency scanning script in `package.json`.
- Prisma schema credentials via `DATABASE_URL` (ensure not committed — no `.env` in repo, good).
- Open redirect not observed in reviewed TS (no `res.redirect(user)`).
- SQL injection: not found; Prisma used.
- Command injection: not found.
- GraphQL: not present.

---

## Informational Findings

- Nest ValidationPipe whitelist is a solid baseline.
- Admin controller class-level guards are correctly ordered `JwtAuthGuard, RolesGuard`.
- Enrollment details scoped by `studentId`.
- Review edit/delete scoped by owner.
- Certificate issue uses `crypto.randomBytes`.
- Exception filter reduces DB/Supabase leak risk.
- Volunteer registration cannot self-assign ADMIN (enum STUDENT/TRAINER or dedicated volunteer endpoint).
- `bodyParser` 1mb limit reduces JSON DoS somewhat.

---

## Security Recommendations

1. Treat JWT as untrusted for authorization: always load user from DB.  
2. Split ADMIN vs SUPER_ADMIN capabilities.  
3. Allowlist CORS; add Helmet, HSTS, CSP, `X-Frame-Options: DENY`.  
4. Rate-limit auth and public GETs; add WAF (Cloudflare) and bot management.  
5. CSPRNG OTPs, hash at rest, lockout.  
6. httpOnly cookies or BFF; remove tokens from localStorage.  
7. MFA for admins.  
8. Password policy + HaveIBeenPwned k-anonymity; reset flow with signed, single-use tokens.  
9. Strict upload pipeline (magic bytes, UUID names, private ACL).  
10. Role guards on every controller.  
11. Token version / password-change invalidation.  
12. Do not mount `TestModule` in production.  
13. Secrets in a vault; never log them.  
14. Security logging: failed login, role change, cert issue, with SIEM.  
15. Periodic `npm audit` / Dependabot / OSV.  
16. Privacy review of public profiles (`/u/:username`).

---

## Remediation Steps (priority)

| P | Item | Owner | Effort |
|---|------|-------|--------|
| P0 | DB-backed JWT validation + is_active | API | 1–2 d |
| P0 | SUPER_ADMIN-only role grants | API | 0.5 d |
| P0 | CORS allowlist | API | 0.5 d |
| P0 | Rate limit login/OTP | API | 1 d |
| P1 | crypto OTP + hash + lockout | API | 1 d |
| P1 | Helmet + CSP | API+FE | 1 d |
| P1 | RolesGuard on students/trainers | API | 1 d |
| P1 | Upload hardening | API | 2 d |
| P1 | Invalidate tokens on password/status change | API | 1 d |
| P2 | MFA, reset, cookie sessions | API+FE | 1–2 w |
| P2 | WAF, CAPTCHA, scraping quotas | Infra | 1 w |
| P2 | Private storage + signed URLs | API | 3 d |

---

## Secure Code Examples

**Rate limiting:**

```typescript
ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 5 }] });
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
login(@Body() dto: LoginDto) { ... }
```

**OTP:**

```typescript
import { randomInt } from 'crypto';
export const generateOtp = () => randomInt(100000, 1000000).toString();
// store sha256(otp + pepper), not plaintext
```

**CORS:**

```typescript
app.enableCors({
  origin: process.env.FRONTEND_ORIGINS.split(','),
  credentials: true,
});
```

**Helmet:**

```typescript
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
```

**Role change:**

```typescript
if (['ADMIN', 'SUPER_ADMIN'].includes(dto.role) && actor.role !== 'SUPER_ADMIN') {
  throw new ForbiddenException();
}
```

---

## Attack Scenarios

### Scenario A — OTP takeover
Register or resend OTP for a victim still unverified → brute 6-digit code without lockout → `email_verified=true` → login if password known/set by attacker (own registration).

### Scenario B — Stolen laptop XSS
XSS on a page that loads user content → read `localStorage.token` → call `/api/admin/*` if role is admin.

### Scenario C — Insider ADMIN
`PATCH .../role` to SUPER_ADMIN → issue certificates, delete programs, read all users.

### Scenario D — Disabled user persistence
User fired → admin sets `is_active=false` → old JWT still hits tasks/PII until expiry.

### Scenario E — Catalog scrape
Unauthenticated loop on `/api/trainers` and `/api/trainers/programs/all` and `/api/students/u/{username}` from leaked usernames via availability API.

### Scenario F — Credential stuffing
No captcha/lockout on `/api/auth/login`; unique error only after user lookup (timing). Email not verified vs invalid password still differs (`Email not verified` vs `Invalid email or password`) — extra enumeration.

---

## Exploitation Examples (illustrative, not a weaponized PoC)

These are **request shapes** for developers to write tests/WAF rules. Do not run against systems you do not own.

**Enumerating emails:**

```http
GET /api/auth/availability?email=admin@example.com
```

**OTP resend mail bomb:**

```http
POST /api/auth/resend-otp
Content-Type: application/json
{"email":"victim@example.com"}
```

**Role promotion (authenticated ADMIN):**

```http
PATCH /api/admin/users/USER_UUID/role
Authorization: Bearer eyJ...
{"role":"SUPER_ADMIN"}
```

**Using token after disable:** same Bearer header on `GET /api/admin/users`.

---

## Web Scraping Resistance

**Difficulty: Very Low (1/10).**

How a scraper would work:

1. `GET /api/trainers` — full public trainer list.  
2. For each slug, `GET /api/trainers/profile/:slug` and reviews.  
3. `GET /api/trainers/programs/all` — all programs.  
4. `GET /api/partners`.  
5. Username wordlist + `GET /api/auth/availability?username=` then `GET /api/students/u/:username` and `GET /api/verify/user/:username`.  
6. Certificate codes: harder if 8-byte random; student 4-byte helper is weaker.  
7. No API keys, no pagination enforcement on some list endpoints, no bot detection, no WAF in app, no CAPTCHA.

**Estimate:** entire public catalog in minutes with a simple `curl`/Python loop.

---

## Business Security

| Item | Status |
|------|--------|
| Admin panel | Frontend `/portal/admin` (guarded in UI); API `/api/admin` JWT+role |
| Hidden routes | Trainer partners admin component; volunteer redirects |
| Debug endpoints | `TestController` present but module not imported |
| Backup/env files | None committed observed |
| Staging | Not in repo |

---

## OWASP Top 10 Mapping

| OWASP | Status |
|-------|--------|
| A01 Broken Access Control | **Fail** — JWT role, ADMIN→SUPER_ADMIN, missing RolesGuard |
| A02 Cryptographic Failures | **Partial** — bcrypt OK; Math.random OTP; tokens in localStorage |
| A03 Injection | **Pass (SQL)** / **Watch XSS** stored content |
| A04 Insecure Design | **Fail** — no MFA, no revocation, public PII profiles |
| A05 Misconfiguration | **Fail** — CORS, headers, rate limit |
| A06 Vulnerable Components | **Unknown** — no CI audit; Nest 12 relatively current |
| A07 Auth Failures | **Fail** — lockout, OTP, enumeration |
| A08 Integrity | **Partial** — no package provenance |
| A09 Logging | **Partial** — Winston; no brute-force detections |
| A10 SSRF | **Low** — URLs stored, not clearly fetched server-side |

---

## Security Checklist

- [ ] DB-validate JWT (active, role)  
- [ ] Token revocation / version  
- [ ] SUPER_ADMIN-only promotions  
- [ ] CORS allowlist  
- [ ] Helmet, HSTS, CSP, frame deny  
- [ ] Rate limits + CAPTCHA  
- [ ] CSPRNG hashed OTP  
- [ ] MFA for admins  
- [ ] Password policy + reset  
- [ ] RolesGuard on all mutating routes  
- [ ] Upload magic-bytes + UUID + private ACL  
- [ ] Remove/never enable TestModule  
- [ ] Secrets in vault  
- [ ] Cookie or BFF session  
- [ ] WAF + bot protection  
- [ ] npm audit in CI  
- [ ] Security logging/alerting  
- [ ] Privacy review of public profiles  
- [ ] Email change re-verify  
- [ ] Invalidate sessions on password change  

---

## Top 10 Risks

1. Immortal JWT (no live user/role/active check)  
2. ADMIN → SUPER_ADMIN promotion  
3. Unthrottled OTP + `Math.random`  
4. Token in localStorage / XSS  
5. CORS `origin: true`  
6. Credential stuffing / no lockout  
7. Unrestricted file upload to public storage  
8. Account enumeration  
9. Public APIs trivially scraped  
10. Email change without verification  

---

## Immediate Fixes

1. Load user in `JwtAuthGuard`; deny inactive.  
2. Restrict role changes.  
3. CORS allowlist.  
4. Throttle `/auth/*`.  
5. Replace `Math.random` OTP.  
6. Do not register `TestModule`.  
7. Add Helmet.  

---

## Long-Term Security Improvements

- Central IAM (Keycloak/Auth0) with MFA, refresh rotation, step-up for admin.  
- Zero-trust admin network (VPN / SSO).  
- Private object storage + signed URLs.  
- Bug bounty / annual pentest.  
- Threat modeling for certificate issuance (fraud).  
- DLP on exports.  
- Formal SDLC: SAST, DAST, dependency, IaC scanning.  
- Privacy program (public profile opt-in).  
- Incident response runbooks for token leak.

---

## Scores (final)

| Metric | Value |
|--------|--------|
| Overall Security Score | **41 / 100** |
| Production Readiness Score | **32 / 100** |
| Rating | **D** |
| Composite Risk | **7.8 / 10 High** |

**Verdict:** Do not expose this stack to the public internet without completing P0/P1 remediations and placing a WAF in front. Prisma and bcrypt are a sound foundation; session, authZ, and edge controls are the gap.

---

*End of report. This assessment is based on source review of the repository as of 2026-09-22. Dynamic testing in a staging environment is recommended to confirm exploitability of upload, CORS, and JWT-expiry configurations.*
