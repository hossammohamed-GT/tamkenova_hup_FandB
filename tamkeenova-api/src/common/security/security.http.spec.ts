import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  apiSecurityHeaders,
  ResponseSecurityInterceptor,
  withoutSecrets,
} from './response-security.interceptor';
import { validateRuntimeConfig } from './runtime-config';
import { isAllowedOrigin } from './cors-origins';
import {
  assertSafeAttachment,
  assertSafeImage,
  safeStorageName,
} from './file-upload';

@Controller('protected')
@UseGuards(JwtAuthGuard, RolesGuard)
class SecurityController {
  @Get()
  @Roles('ADMIN')
  data() {
    return {
      user: {
        full_name: 'Test',
        password: 'hash',
        token_version: 1,
        nested: [{ otp_code: 'secret', value: 1 }],
      },
      access_token: 'intended-login-token',
      issued_at: new Date('2026-10-01'),
    };
  }
}

describe('Real security HTTP and content boundaries', () => {
  let app: INestApplication;
  const secret = 'security-test-only-secret-with-more-than-32-bytes';
  let oldSecret: string | undefined;
  let current = {
    id: 'user',
    role: 'ADMIN',
    is_active: true,
    email_verified: true,
    token_version: 0,
  };
  const findUser = jest.fn<any>(async () => current);
  const token = (claims: object = {}, options: jwt.SignOptions = {}) =>
    jwt.sign({ sub: 'user', tv: 0, ...claims }, secret, {
      expiresIn: '1h',
      ...options,
    });
  beforeAll(async () => {
    oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = secret;
    const fixture = await Test.createTestingModule({
      controllers: [SecurityController],
      providers: [
        {
          provide: PrismaService,
          useValue: { users: { findUnique: findUser } },
        },
      ],
    }).compile();
    app = fixture.createNestApplication();
    app.use(apiSecurityHeaders);
    app.useGlobalInterceptors(new ResponseSecurityInterceptor());
    await app.init();
  });
  beforeEach(() => {
    current = {
      id: 'user',
      role: 'ADMIN',
      is_active: true,
      email_verified: true,
      token_version: 0,
    };
    findUser.mockClear();
  });
  afterAll(async () => {
    await app.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });
  it('requires authentication and makes even failed private responses non-cacheable/non-indexable', async () => {
    const response = await request(app.getHttpServer())
      .get('/protected')
      .expect(401);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['x-robots-tag']).toContain('noindex');
  });
  it('removes nested password/OTP material without damaging dates or intentional login tokens', async () => {
    const response = await request(app.getHttpServer())
      .get('/protected')
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect(response.body.user).toEqual({
      full_name: 'Test',
      nested: [{ value: 1 }],
    });
    expect(response.body.access_token).toBe('intended-login-token');
    expect(response.body.issued_at).toBe('2026-10-01T00:00:00.000Z');
    expect(
      withoutSecrets(
        Object.assign(Object.create(null), { password: 'hidden', safe: 'yes' }),
      ),
    ).toEqual({ safe: 'yes' });
  });
  it('uses the current database role rather than a forged admin role claim', async () => {
    current.role = 'STUDENT';
    await request(app.getHttpServer())
      .get('/protected')
      .auth(token({ role: 'ADMIN' }), { type: 'bearer' })
      .expect(403);
  });
  for (const state of ['is_active', 'email_verified'] as const) {
    it(`rejects a user with ${state}=false`, async () => {
      current[state] = false;
      await request(app.getHttpServer())
        .get('/protected')
        .auth(token(), { type: 'bearer' })
        .expect(401);
    });
  }
  it('rejects revoked token versions', async () => {
    current.token_version = 1;
    await request(app.getHttpServer())
      .get('/protected')
      .auth(token(), { type: 'bearer' })
      .expect(401);
  });
  it('rejects malformed claims, expired and non-HS256 tokens before database access', async () => {
    const invalid = [
      token({ sub: '' }),
      token({ tv: -1 }),
      token({ tv: '0' }),
      token({}, { algorithm: 'HS384' }),
      token({}, { expiresIn: '-1s' }),
      jwt.sign({ sub: 'user', tv: 0 }, secret),
    ];
    for (const value of invalid)
      await request(app.getHttpServer())
        .get('/protected')
        .auth(value, { type: 'bearer' })
        .expect(401);
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${token()} extra`)
      .expect(401);
    expect(findUser).not.toHaveBeenCalled();
  });
  it('validates production secret length without logging a secret', () => {
    expect(() =>
      validateRuntimeConfig({ NODE_ENV: 'production', JWT_SECRET: 'short' }),
    ).toThrow('32 bytes');
    expect(() =>
      validateRuntimeConfig({
        NODE_ENV: 'production',
        JWT_SECRET: secret,
        OTP_PEPPER: 'short',
      }),
    ).toThrow('32 bytes');
    expect(() =>
      validateRuntimeConfig({
        NODE_ENV: 'production',
        JWT_SECRET: secret,
        OTP_PEPPER: secret,
      }),
    ).not.toThrow();
    expect(
      validateRuntimeConfig({ NODE_ENV: 'production', JWT_SECRET: secret })[
        'JWT_SECRET'
      ],
    ).toBe(secret);
  });
  it('allows exact configured origins, never suffixes or opaque/null origins', () => {
    expect(isAllowedOrigin('https://tamkeenova-hub.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://tamkeenova-hub.vercel.app.evil.test')).toBe(
      false,
    );
    expect(isAllowedOrigin('null')).toBe(false);
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin('https://tamkeenova-hub.vercel.app/')).toBe(false);
  });
  it('checks bytes, declared media type, real length, and safe storage extensions', () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(() => assertSafeAttachment(png, 'image/png')).not.toThrow();
    expect(() =>
      assertSafeAttachment(
        Buffer.from('<svg onload="alert(1)"/>'),
        'image/png',
      ),
    ).toThrow();
    expect(() => assertSafeAttachment(png, 'image/jpeg')).toThrow();
    expect(() =>
      assertSafeAttachment(
        Buffer.alloc(10 * 1024 * 1024 + 1),
        'application/pdf',
      ),
    ).toThrow();
    expect(() =>
      assertSafeImage({ buffer: png, size: 1, mimetype: 'image/jpeg' } as any),
    ).toThrow();
    expect(() =>
      assertSafeImage(
        { buffer: png, size: 1, mimetype: 'image/png' } as any,
        7,
      ),
    ).toThrow();
    expect(safeStorageName('image/jpeg')).toMatch(/^[a-f0-9-]+\.jpg$/);
    expect(safeStorageName('application/msword')).toMatch(/\.doc$/);
  });
});
