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
import { type INestApplication } from '@nestjs/common';
import { applicationValidationPipe } from '../../common/validation/field-validation';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import type { LoggerService } from '../../common/logger/logger.service';
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
    app.useGlobalPipes(applicationValidationPipe());
    app.useGlobalFilters(
      new GlobalExceptionFilter({
        logError: jest.fn(),
      } as unknown as LoggerService),
    );
    await app.init();
  });
  beforeEach(() => {
    role = 'STUDENT';
    active = true;
    for (const fn of Object.values(service)) (fn as any).mockClear();
  });
  it.each(['TRAINER', 'ADMIN', 'SUPER_ADMIN'])('%s cannot enter learner checkout, enrollment, library or completion routes', async blockedRole => {
    role = blockedRole;
    for (const path of [
      `checkout/${id}`,
      'library',
      'library/payments',
      `learning/${id}`,
    ])
      await request(app.getHttpServer())
        .get('/api/course-workflow/' + path)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    for (const path of [
      `enroll/${id}/free`,
      `checkout/${id}/report`,
      `learning/${id}/completion`,
      `learning/${id}/lessons/${id}/done`,
    ])
      await request(app.getHttpServer())
        .post('/api/course-workflow/' + path)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(403);
    expect(service.enrollFree).not.toHaveBeenCalled();
    expect(service.reportTransfer).not.toHaveBeenCalled();
    expect(service.markLesson).not.toHaveBeenCalled();
  });
  it('preserves learner access for learner roles, including clients', async () => {
    for (const learnerRole of [
      'STUDENT',
      'CLIENT',
      'EMPLOYEE',
      'VOLUNTEER',
    ]) {
      role = learnerRole;
      await request(app.getHttpServer())
        .get('/api/course-workflow/library')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/course-workflow/checkout/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }
  });
  const detailedDraft = () => ({
    title_ar: 'عنوان الكورس',
    title_en: 'Course title',
    description_ar: 'الوصف',
    description_en: 'Description',
    short_description_ar: 'نبذة',
    short_description_en: 'Summary',
    content_type: 'PODCOURSE',
    category_id: id,
    preview_video_url: 'https://youtu.be/5BciHXh074k',
    cover_image_url: '',
    price: 0,
    language: 'ar',
    level: 'BEGINNER',
    sections: [
      {
        title_ar: 'جزء',
        title_en: 'Chapter',
        lessons: [
          {
            title_ar: 'درس',
            title_en: 'Lesson',
            description_ar: 'وصف الدرس',
            description_en: 'Lesson description',
            media_url: 'https://youtu.be/5BciHXh074k',
            duration_minutes: 10,
            is_preview: false,
          },
        ],
      },
    ],
  });
  it('accepts all seven fields reported as forbidden by the outdated deployed API, without dropping them', async () => {
    role = 'TRAINER';
    const draft = detailedDraft();
    draft.sections[0].lessons.push({
      ...draft.sections[0].lessons[0],
      title_ar: 'الدرس الثاني',
      title_en: 'Second lesson',
    });
    await request(app.getHttpServer())
      .post('/api/course-workflow/trainer/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(draft)
      .expect(201);
    expect(
      service.saveCourse.mock.calls[0][1].sections[0].lessons,
    ).toHaveLength(2);
    expect(
      service.saveCourse.mock.calls[0][1].sections[0].lessons[1],
    ).toMatchObject({
      description_ar: 'وصف الدرس',
      description_en: 'Lesson description',
    });
    expect(service.saveCourse).toHaveBeenCalledWith(
      id,
      expect.objectContaining({
        short_description_ar: 'نبذة',
        short_description_en: 'Summary',
        content_type: 'PODCOURSE',
        sections: [
          expect.objectContaining({
            lessons: expect.arrayContaining([
              expect.objectContaining({
                description_ar: 'وصف الدرس',
                description_en: 'Lesson description',
              }),
            ]),
          }),
        ],
      }),
    );
  });
  it('preserves exact nested field paths through the actual validation pipe and global exception filter, without echoing request values', async () => {
    role = 'TRAINER';
    const draft = detailedDraft();
    draft.sections[0].lessons[0].duration_minutes = 0;
    (draft.sections[0].lessons[0] as any).status = 'PUBLISHED';
    draft.title_ar = 'x';
    const result = await request(app.getHttpServer())
      .post('/api/course-workflow/trainer/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(draft)
      .expect(400);
    expect(result.body.error_code).toBe('VALIDATION_FAILED');
    expect(Object.keys(result.body.field_errors).sort()).toEqual([
      'sections.0.lessons.0.duration_minutes',
      'sections.0.lessons.0.status',
      'title_ar',
    ]);
    expect(JSON.stringify(result.body)).not.toContain('وصف الدرس');
    expect(service.saveCourse).not.toHaveBeenCalled();
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
