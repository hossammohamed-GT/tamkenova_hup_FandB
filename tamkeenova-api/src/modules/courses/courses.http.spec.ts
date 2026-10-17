import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { CoursesModule } from './courses.module';
import { PrismaService } from '../../prisma/prisma.service';
const id = '22222222-2222-4222-a222-222222222222';
describe('Protected lesson HTTP boundary', () => {
  let app: INestApplication;
  let token: string;
  let enrolled = false;
  let oldSecret: string | undefined;
  beforeAll(async () => {
    oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'local-course-playback-test-secret';
    token = jwt.sign({ sub: 'student', tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const db = {
      users: {
        findUnique: jest
          .fn<(...args: any[]) => Promise<any>>()
          .mockResolvedValue({
            id: 'student',
            is_active: true,
            email_verified: true,
            token_version: 0,
          }),
      },
      course_lessons: {
        findFirst: async () => ({
          id,
          media_url: 'https://youtu.be/5BciHXh074k',
          is_preview: false,
          courses: {
            is_free: false,
            enrollments: enrolled ? [{ id: 'e' }] : [],
          },
        }),
      },
    };
    const module = await Test.createTestingModule({ imports: [CoursesModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });
  it('rejects anonymous playback before accessing course data', async () => {
    await request(app.getHttpServer())
      .get(`/api/courses/course/lessons/${id}/playback`)
      .expect(401);
  });
  it('rejects an authenticated non-enrolled viewer', async () => {
    enrolled = false;
    await request(app.getHttpServer())
      .get(`/api/courses/course/lessons/${id}/playback`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
  it('returns a private, non-cacheable playback response to an enrolled viewer', async () => {
    enrolled = true;
    const result = await request(app.getHttpServer())
      .get(`/api/courses/course/lessons/${id}/playback`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(result.body.data.media_url).toBe('https://youtu.be/5BciHXh074k');
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(result.headers.vary).toContain('Authorization');
  });
  it('rejects malformed lesson IDs', async () => {
    await request(app.getHttpServer())
      .get('/api/courses/course/lessons/not-a-uuid/playback')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
