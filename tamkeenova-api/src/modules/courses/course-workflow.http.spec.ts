import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { CoursesModule } from './courses.module';
import { CourseWorkflowService } from './course-workflow.service';
import { PrismaService } from '../../prisma/prisma.service';
const id = '11111111-1111-4111-a111-111111111111';
describe('Workflow HTTP authentication, current roles and DTO boundary', () => {
  let app: INestApplication,
    token: string,
    role = 'STUDENT',
    active = true,
    oldSecret: string | undefined;
  const service: any = {};
  for (const method of [
    'trainerCourses',
    'courseForReview',
    'saveCourse',
    'submitCourse',
    'trainerCompletions',
    'reviewCompletion',
    'adminCourses',
    'reviewCourse',
    'adminPayments',
    'reviewPayment',
    'settings',
    'saveSettings',
    'checkout',
    'reportTransfer',
    'enrollFree',
    'library',
    'myPayments',
    'learning',
    'markLesson',
    'requestCompletion',
  ])
    service[method] = jest
      .fn<(...args: any[]) => Promise<any>>()
      .mockResolvedValue([]);
  beforeAll(async () => {
    oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'workflow-http-test-secret';
    token = jwt.sign(
      { sub: id, tv: 0, role: 'SUPER_ADMIN' },
      process.env.JWT_SECRET,
    );
    const module = await Test.createTestingModule({ imports: [CoursesModule] })
      .overrideProvider(PrismaService)
      .useValue({
        users: {
          findUnique: async () => ({
            id,
            role,
            is_active: active,
            email_verified: true,
            token_version: 0,
          }),
        },
      })
      .overrideProvider(CourseWorkflowService)
      .useValue(service)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  beforeEach(() => {
    role = 'STUDENT';
    active = true;
    for (const fn of Object.values(service)) (fn as any).mockClear();
  });
  afterAll(async () => {
    await app?.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });
  it('all private queues, quotes, progress and history reject anonymous reads', async () => {
    for (const path of [
      'trainer/courses',
      'trainer/completions',
      'admin/courses',
      'admin/payments',
      'admin/settings',
      `checkout/${id}`,
      'library',
      'library/payments',
      `learning/${id}`,
    ])
      await request(app.getHttpServer())
        .get('/api/course-workflow/' + path)
        .expect(401);
    expect(service.checkout).not.toHaveBeenCalled();
  });
  it('uses the active DB role, not a forged/stale administrator claim', async () => {
    await request(app.getHttpServer())
      .get('/api/course-workflow/admin/payments')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/course-workflow/trainer/courses/${id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(403);
    expect(service.adminPayments).not.toHaveBeenCalled();
    expect(service.submitCourse).not.toHaveBeenCalled();
  });
  it('blocks inactive accounts even with a valid signed JWT', async () => {
    active = false;
    await request(app.getHttpServer())
      .get('/api/course-workflow/library')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(service.library).not.toHaveBeenCalled();
  });
  it('allows both admin roles, with no-store protection for payment details', async () => {
    for (const admin of ['ADMIN', 'SUPER_ADMIN']) {
      role = admin;
      const result = await request(app.getHttpServer())
        .get('/api/course-workflow/admin/payments?status=PENDING')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(result.headers['cache-control']).toBe('private, no-store');
    }
    expect(service.adminPayments).toHaveBeenCalledTimes(2);
  });
  it('separates publication permission from instructor completion confirmation', async () => {
    role = 'ADMIN';
    await request(app.getHttpServer())
      .post(`/api/course-workflow/trainer/completions/${id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ decision: 'APPROVE' })
      .expect(403);
    role = 'TRAINER';
    await request(app.getHttpServer())
      .post(`/api/course-workflow/admin/courses/${id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ decision: 'APPROVE', revision: 1 })
      .expect(403);
    expect(service.reviewCourse).not.toHaveBeenCalled();
    expect(service.reviewCompletion).not.toHaveBeenCalled();
  });
  it('passes the current user to owned reads and refuses malformed UUIDs', async () => {
    await request(app.getHttpServer())
      .get('/api/course-workflow/library/payments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(service.myPayments).toHaveBeenCalledWith(id);
    await request(app.getHttpServer())
      .get('/api/course-workflow/learning/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(service.learning).not.toHaveBeenCalled();
  });
  it('rejects body-based enrollment/payment status escalation and malformed transfers', async () => {
    await request(app.getHttpServer())
      .post(`/api/course-workflow/checkout/${id}/report`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        quote_token: 'a'.repeat(40),
        method: 'INSTAPAY',
        sender_account: 'sender',
        reported_amount: 125.555,
        transferred_at: 'tomorrow',
        status: 'APPROVED',
        user_id: id,
      })
      .expect(400);
    expect(service.reportTransfer).not.toHaveBeenCalled();
  });
  it('rejects draft ownership/status spoofing rather than silently accepting it', async () => {
    role = 'TRAINER';
    await request(app.getHttpServer())
      .post('/api/course-workflow/trainer/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title_ar: 'تجربة',
        title_en: 'Test',
        description_ar: 'وصف',
        description_en: 'Description',
        category_id: id,
        preview_video_url: 'https://youtu.be/5BciHXh074k',
        price: 0,
        language: 'ar',
        level: 'BEGINNER',
        sections: [],
        owner_trainer_id: id,
        status: 'PUBLISHED',
        review_status: 'APPROVED',
      })
      .expect(400);
    expect(service.saveCourse).not.toHaveBeenCalled();
  });
});
