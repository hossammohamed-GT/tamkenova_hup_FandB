# TamkeeNova HUB — Security System Design

## Trust boundaries

```
Browser (Angular / Vercel)
        | HTTPS, CORS allowlist
        v
NestJS API  (/api)
        | Prisma parameterized queries
        v
PostgreSQL
        |
        +--> Supabase Storage (UUID object names)
        +--> Gmail SMTP (OTP / reset mail)
```

## Authentication

1. Register → bcrypt(12) → hashed OTP (SHA-256 + pepper) emailed → verify.
2. Login → lock after 5 failures (15 min) → JWT `{ sub, email, role, tv }`.
3. Every request: verify JWT, **reload user**, require `is_active` + `email_verified`, match `token_version`.
4. Password change, reset, role change, or deactivation **increments `token_version`** (all sessions die).
5. Forgot password: same response whether the email exists; OTP purpose `PASSWORD_RESET`.

## Authorization

- `JwtAuthGuard` + `RolesGuard`.
- Trainer mutations require `TRAINER`.
- Admin APIs require `ADMIN` or `SUPER_ADMIN`.
- Only **SUPER_ADMIN** may assign `ADMIN` / `SUPER_ADMIN`.

## Edge controls

- CORS: `https://tamkeenova-hub.vercel.app` + localhost.
- Helmet (frame deny, HSTS, nosniff).
- Global + auth-specific throttling.
- Uploads: magic-byte images, size limits, UUID filenames.

## Operations

Apply `tamkeenova-api/prisma/security-hardening.sql` then `prisma generate` before deploy.
