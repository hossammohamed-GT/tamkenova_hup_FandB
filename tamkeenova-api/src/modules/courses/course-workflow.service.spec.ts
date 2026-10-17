import 'reflect-metadata';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { CourseWorkflowService } from './course-workflow.service';
import { CourseWorkflowController } from './course-workflow.controller';
import {
  cents,
  normalizedReference,
  requireYoutube,
} from './course-workflow.rules';
import {
  CourseDraftDto,
  TransferReportDto,
  PaymentDecisionDto,
} from './dto/course-workflow.dto';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
const mock = () => jest.fn<(...args: any[]) => Promise<any>>();
const course = {
  id: 'course',
  owner_trainer_id: 'trainer',
  title_ar: 'كورس تجريبي',
  title_en: 'Test course',
  description_ar: 'شرح',
  description_en: 'Description',
  preview_video_url: 'https://youtu.be/5BciHXh074k',
  duration_minutes: 90,
  price: 125.5,
  is_free: false,
  status: 'PUBLISHED',
  review_status: 'APPROVED',
  revision: 1,
  owner: { id: 'trainer', user_id: 'teacher', trainer_status: 'APPROVED' },
};
const payment = {
  id: 'payment',
  course_id: 'course',
  user_id: 'learner',
  method: 'INSTAPAY',
  expected_amount: 125.5,
  status: 'PENDING',
  courses: course,
};
function setup() {
  const db: any = {};
  for (const table of [
    'courses',
    'trainers',
    'users',
    'course_enrollments',
    'course_payment_requests',
    'course_checkout_settings',
    'course_sections',
    'course_lessons',
    'course_categories',
    'course_category_links',
    'course_instructors',
    'course_lesson_progress',
    'certificates',
    'notifications',
    'activity_logs',
  ]) {
    db[table] = {};
    for (const method of [
      'findFirst',
      'findUnique',
      'findUniqueOrThrow',
      'findMany',
      'count',
      'create',
      'createMany',
      'update',
      'updateMany',
      'upsert',
      'deleteMany',
    ])
      db[table][method] = mock();
  }
  db.$transaction = jest.fn(async (fn: any) => fn(db));
  db.courses.findFirst.mockResolvedValue(course);
  db.courses.findUnique.mockResolvedValue(course);
  db.course_enrollments.findFirst.mockResolvedValue(null);
  db.course_enrollments.updateMany.mockResolvedValue({ count: 1 });
  db.course_payment_requests.findUnique.mockResolvedValue(payment);
  db.course_payment_requests.create.mockResolvedValue(payment);
  db.course_payment_requests.updateMany.mockResolvedValue({ count: 1 });
  db.users.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);
  db.course_lessons.count.mockResolvedValue(2);
  db.course_lesson_progress.count.mockResolvedValue(2);
  db.trainers.findFirst.mockResolvedValue(null);
  return { db, service: new CourseWorkflowService(db) };
}
function quote(overrides: object = {}) {
  return jwt.sign(
    {
      kind: 'COURSE_PAYMENT_QUOTE',
      user_id: 'learner',
      course_id: 'course',
      amount_cents: 12550,
      methods: [{ method: 'INSTAPAY', account: 'test-only@instapay' }],
      ...overrides,
    },
    process.env.JWT_SECRET!,
    {
      audience: 'course-checkout',
      issuer: 'tamkeenova',
      ...('exp' in overrides ? {} : { expiresIn: '24h' as const }),
    },
  );
}
const report = (token = quote()) => ({
  quote_token: token,
  method: 'INSTAPAY',
  sender_account: 'actual-sender',
  reported_amount: 125.5,
  transferred_at: new Date().toISOString(),
});
const teacher = (db: any) =>
  db.trainers.findFirst.mockResolvedValue({
    id: 'trainer',
    user_id: 'teacher',
    users: { full_name: 'Test Instructor' },
  });
const enrollment = {
  id: 'enrollment',
  course_id: 'course',
  user_id: 'learner',
  status: 'ACTIVE',
  completion_state: 'PENDING',
  recipient_name_ar: 'اسم الطالب',
  recipient_name_en: 'Learner Name',
  courses: course,
  certificate: null,
};
beforeEach(() => {
  process.env.JWT_SECRET = 'workflow-unit-test-secret-not-production';
});
describe('Authoring and publication approval', () => {
  it('denies unapproved instructors', async () => {
    const { service } = setup();
    await expect(service.trainerCourses('teacher')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('requires ownership even for an approved instructor', async () => {
    const { db, service } = setup();
    teacher(db);
    db.courses.findFirst.mockResolvedValue(null);
    await expect(
      service.courseForReview('course', 'other-teacher'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('submits a validated draft, notifying all active admins but never publishing', async () => {
    const { db, service } = setup();
    teacher(db);
    db.courses.findFirst.mockResolvedValue({
      ...course,
      status: 'DRAFT',
      review_status: 'DRAFT',
    });
    db.course_sections.findMany.mockResolvedValue([
      {
        lessons: [
          { media_url: course.preview_video_url, duration_minutes: 10 },
        ],
      },
    ]);
    db.courses.updateMany.mockResolvedValue({ count: 1 });
    await service.submitCourse('teacher', 'course');
    expect(db.courses.updateMany.mock.calls[0][0].data).toEqual({
      review_status: 'PENDING',
      review_note: null,
    });
    expect(db.users.findMany.mock.calls[0][0].where).toEqual({
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      is_active: true,
    });
    expect(
      db.notifications.createMany.mock.calls[0][0].data.map(
        (n: any) => n.user_id,
      ),
    ).toEqual(['admin-1', 'admin-2']);
  });
  it('rejects empty chapters before submission', async () => {
    const { db, service } = setup();
    teacher(db);
    db.courses.findFirst.mockResolvedValue({
      ...course,
      status: 'DRAFT',
      review_status: 'DRAFT',
    });
    db.course_sections.findMany.mockResolvedValue([{ lessons: [] }]);
    await expect(
      service.submitCourse('teacher', 'course'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.notifications.createMany).not.toHaveBeenCalled();
  });
  it('does not let the author approve their own course', async () => {
    const { service } = setup();
    await expect(
      service.reviewCourse('teacher', 'course', {
        decision: 'APPROVE',
        revision: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('uses revision + pending-state CAS; only one administrator can publish', async () => {
    const { db, service } = setup();
    db.courses.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValue({ count: 0 });
    const first = service.reviewCourse('admin-1', 'course', {
      decision: 'APPROVE',
      revision: 1,
    });
    const second = service.reviewCourse('admin-2', 'course', {
      decision: 'APPROVE',
      revision: 1,
    });
    const outcomes = await Promise.allSettled([first, second]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(db.courses.updateMany.mock.calls[0][0].where).toEqual({
      id: 'course',
      revision: 1,
      status: 'DRAFT',
      review_status: 'PENDING',
    });
    expect(db.notifications.createMany).toHaveBeenCalledTimes(1);
  });
  it('requires a rejection reason and never updates on an empty reason', async () => {
    const { db, service } = setup();
    await expect(
      service.reviewCourse('admin', 'course', {
        decision: 'REJECT',
        revision: 1,
        note: '  ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.courses.updateMany).not.toHaveBeenCalled();
  });
  it('prevents replacing lessons in a published or submitted course', async () => {
    const { db, service } = setup();
    teacher(db);
    await expect(
      service.saveCourse(
        'teacher',
        { sections: [] } as unknown as CourseDraftDto,
        'course',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.course_lessons.deleteMany).not.toHaveBeenCalled();
  });
});
describe('Configured destinations, quotes and reporting', () => {
  it('keeps checkout disabled with no real configured account', async () => {
    const { db, service } = setup();
    db.course_payment_requests.findMany.mockResolvedValue([]);
    db.course_checkout_settings.findUnique.mockResolvedValue(null);
    const result = await service.checkout('learner', 'course');
    expect(result.payment_enabled).toBe(false);
    expect(result.methods).toEqual([]);
    expect(result.quote_token).toBeNull();
  });
  it('requires a valid destination before enabling checkout', async () => {
    const { db, service } = setup();
    await expect(
      service.saveSettings('admin', { enabled: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.saveSettings('admin', {
        enabled: true,
        vodafone_cash: 'not-a-phone',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.course_checkout_settings.upsert).not.toHaveBeenCalled();
  });
  it('binds the checkout quote to user, course, price and receiving-account snapshot', async () => {
    const { db, service } = setup();
    db.course_payment_requests.findMany.mockResolvedValue([]);
    db.course_checkout_settings.findUnique.mockResolvedValue({
      enabled: true,
      instapay: 'test-only@instapay',
    });
    const result = await service.checkout('learner', 'course');
    const decoded = jwt.verify(
      result.quote_token!,
      process.env.JWT_SECRET!,
    ) as any;
    expect(decoded).toMatchObject({
      user_id: 'learner',
      course_id: 'course',
      amount_cents: 12550,
      methods: [{ method: 'INSTAPAY', account: 'test-only@instapay' }],
    });
  });
  it('refuses foreign-user, foreign-course, expired and tampered quotes', async () => {
    const { db, service } = setup();
    for (const token of [
      quote({ user_id: 'other' }),
      quote({ course_id: 'other' }),
      quote({ exp: 1 }),
      quote() + 'bad',
    ]) {
      await expect(
        service.reportTransfer('learner', 'course', report(token)),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(db.course_payment_requests.create).not.toHaveBeenCalled();
  });
  it('records transfer details against the signed snapshot and never enrolls', async () => {
    const { db, service } = setup();
    await service.reportTransfer('learner', 'course', report());
    expect(
      db.course_payment_requests.create.mock.calls[0][0].data,
    ).toMatchObject({
      expected_amount: 125.5,
      recipient_account: 'test-only@instapay',
      reported_amount: 125.5,
      sender_account: 'actual-sender',
    });
    expect(db.course_enrollments.upsert).not.toHaveBeenCalled();
    expect(db.certificates.create).not.toHaveBeenCalled();
    expect(db.notifications.createMany.mock.calls[0][0].data).toHaveLength(2);
  });
  it('returns an existing pending report rather than notifying admins again', async () => {
    const { db, service } = setup();
    db.course_payment_requests.findFirst.mockResolvedValue(payment);
    expect(await service.reportTransfer('learner', 'course', report())).toEqual(
      payment,
    );
    expect(db.course_payment_requests.create).not.toHaveBeenCalled();
    expect(db.notifications.createMany).not.toHaveBeenCalled();
  });
  it('blocks the instructor from enrolling in or paying for their own course', async () => {
    const { db, service } = setup();
    teacher(db);
    await expect(
      service.enrollFree('teacher', 'course'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.reportTransfer(
        'teacher',
        'course',
        report(quote({ user_id: 'teacher' })),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('does not permit enrollment or repeated payment for an already active learner', async () => {
    const { db, service } = setup();
    db.course_enrollments.findFirst.mockResolvedValue(enrollment);
    await expect(
      service.reportTransfer('learner', 'course', report()),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.course_payment_requests.create).not.toHaveBeenCalled();
  });
});
describe('Independent admin payment review', () => {
  it('requires exact actual receipt and a confirmed reference', async () => {
    const { db, service } = setup();
    for (const dto of [
      {
        decision: 'APPROVE',
        confirmed_amount: 100,
        confirmed_reference: 'REF-1',
      },
      { decision: 'APPROVE', confirmed_amount: 125.5 },
      {
        decision: 'APPROVE',
        confirmed_amount: 125.5,
        confirmed_reference: '   ',
      },
    ])
      await expect(
        service.reviewPayment('admin', 'payment', dto),
      ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.course_enrollments.upsert).not.toHaveBeenCalled();
  });
  it('never lets an admin approve their own transfer', async () => {
    const { service } = setup();
    await expect(
      service.reviewPayment('learner', 'payment', {
        decision: 'APPROVE',
        confirmed_amount: 125.5,
        confirmed_reference: 'REF-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('activates only after winning review CAS; payment does not issue a certificate', async () => {
    const { db, service } = setup();
    await service.reviewPayment('admin', 'payment', {
      decision: 'APPROVE',
      confirmed_amount: 125.5,
      confirmed_reference: ' bank - 12 ',
    });
    expect(
      db.course_payment_requests.updateMany.mock.calls[0][0],
    ).toMatchObject({
      where: { id: 'payment', status: 'PENDING' },
      data: { status: 'APPROVED', confirmed_reference: 'BANK-12' },
    });
    expect(db.course_enrollments.upsert).toHaveBeenCalledTimes(1);
    expect(db.certificates.create).not.toHaveBeenCalled();
  });
  it('rejects a second admin decision without enrollment or notification', async () => {
    const { db, service } = setup();
    db.course_payment_requests.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.reviewPayment('admin', 'payment', {
        decision: 'APPROVE',
        confirmed_amount: 125.5,
        confirmed_reference: 'REF-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.course_enrollments.upsert).not.toHaveBeenCalled();
    expect(db.notifications.createMany).not.toHaveBeenCalled();
  });
  it('maps database duplicate-reference/serialization errors to a refresh conflict', async () => {
    for (const code of ['P2002', 'P2034']) {
      const { db, service } = setup();
      db.course_payment_requests.updateMany.mockRejectedValue({ code });
      await expect(
        service.reviewPayment('admin', 'payment', {
          decision: 'APPROVE',
          confirmed_amount: 125.5,
          confirmed_reference: 'REF-1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.course_enrollments.upsert).not.toHaveBeenCalled();
    }
  });
  it('rejecting a report requires a reason and cannot grant course access', async () => {
    const { db, service } = setup();
    await service.reviewPayment('admin', 'payment', {
      decision: 'REJECT',
      note: 'Transfer not received',
    });
    expect(db.course_enrollments.upsert).not.toHaveBeenCalled();
    expect(db.notifications.createMany).toHaveBeenCalledTimes(1);
  });
});
describe('Learner progress and instructor-confirmed automatic certification', () => {
  it('free reenrollment is idempotent and does not downgrade completed enrollment', async () => {
    const { db, service } = setup();
    db.course_enrollments.findUnique.mockResolvedValue({
      ...enrollment,
      status: 'COMPLETED',
    });
    const result = await service.enrollFree('learner', 'course');
    expect(result.status).toBe('COMPLETED');
    expect(db.course_enrollments.update).not.toHaveBeenCalled();
  });
  it('requires actual enrollment for lesson marks', async () => {
    const { db, service } = setup();
    await expect(
      service.markLesson('learner', 'course', 'lesson'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.course_lesson_progress.upsert).not.toHaveBeenCalled();
  });
  it('locks an active enrollment before marking/counting; lesson must belong to this course', async () => {
    const { db, service } = setup();
    db.course_enrollments.findFirst.mockResolvedValue(enrollment);
    db.course_lessons.findFirst.mockResolvedValue({ id: 'lesson' });
    await service.markLesson('learner', 'course', 'lesson');
    expect(db.course_enrollments.updateMany.mock.calls[0][0].where).toEqual({
      id: 'enrollment',
      status: 'ACTIVE',
    });
    expect(db.course_lessons.findFirst.mock.calls[0][0].where).toEqual({
      id: 'lesson',
      course_id: 'course',
      is_active: true,
    });
    expect(db.course_enrollments.update.mock.calls[0][0].data.progress).toBe(
      100,
    );
    expect(db.certificates.create).not.toHaveBeenCalled();
  });
  it('rejects incomplete and instructorless completion requests', async () => {
    const { db, service } = setup();
    db.course_enrollments.findFirst.mockResolvedValue(enrollment);
    db.course_lesson_progress.count.mockResolvedValue(1);
    await expect(
      service.requestCompletion('learner', 'course', {
        recipient_name_ar: 'اسم الطالب',
        recipient_name_en: 'Learner Name',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    db.courses.findUnique.mockResolvedValue({ ...course, owner: null });
    await expect(
      service.requestCompletion('learner', 'course', {
        recipient_name_ar: 'اسم الطالب',
        recipient_name_en: 'Learner Name',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.certificates.create).not.toHaveBeenCalled();
  });
  it('queues complete learners for their own instructor; does not issue yet', async () => {
    const { db, service } = setup();
    db.course_enrollments.findFirst.mockResolvedValue(enrollment);
    await service.requestCompletion('learner', 'course', {
      recipient_name_ar: 'اسم الطالب',
      recipient_name_en: 'Learner Name',
    });
    expect(
      db.course_enrollments.updateMany.mock.calls[0][0].data.completion_state,
    ).toBe('PENDING');
    expect(db.notifications.createMany.mock.calls[0][0].data[0].user_id).toBe(
      'teacher',
    );
    expect(db.certificates.create).not.toHaveBeenCalled();
  });
  it('does not let a different instructor review completion', async () => {
    const { db, service } = setup();
    teacher(db);
    db.course_enrollments.findFirst.mockResolvedValue(null);
    await expect(
      service.reviewCompletion('other', 'enrollment', { decision: 'APPROVE' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      db.course_enrollments.findFirst.mock.calls[0][0].where.courses
        .owner_trainer_id,
    ).toBe('trainer');
  });
  it('issues the existing bilingual 2026.3 certificate exactly on instructor approval', async () => {
    const { db, service } = setup();
    teacher(db);
    db.course_enrollments.findFirst.mockResolvedValue(enrollment);
    db.certificates.create.mockImplementation(async ({ data }: any) => ({
      id: 'certificate',
      ...data,
    }));
    const result = await service.reviewCompletion('teacher', 'enrollment', {
      decision: 'APPROVE',
    });
    expect(result.certificate).toMatchObject({
      student_id: 'learner',
      course_id: 'course',
      course_enrollment_id: 'enrollment',
      template_version: '2026.3',
      certificate_type: 'TRAINING',
      training_hours: 2,
    });
    const meta = JSON.parse(result.certificate!.description!);
    expect(meta).toMatchObject({
      recipient_name_ar: 'اسم الطالب',
      recipient_name_en: 'Learner Name',
      program_name_ar: course.title_ar,
      program_name_en: course.title_en,
    });
    expect(db.course_enrollments.updateMany.mock.calls[0][0].data.status).toBe(
      'COMPLETED',
    );
    expect(
      db.notifications.createMany.mock.calls[0][0].data[0].reference_type,
    ).toBe('COURSE_CERTIFICATE');
  });
  it('retrying certificate approval returns the one linked certificate, without duplicate side effects', async () => {
    const { db, service } = setup();
    teacher(db);
    db.course_enrollments.findFirst.mockResolvedValue({
      ...enrollment,
      certificate: { id: 'existing' },
    });
    expect(
      (
        await service.reviewCompletion('teacher', 'enrollment', {
          decision: 'APPROVE',
        })
      ).certificate,
    ).toEqual({ id: 'existing' });
    expect(db.certificates.create).not.toHaveBeenCalled();
    expect(db.notifications.createMany).not.toHaveBeenCalled();
  });
  it('a rejected completion never creates a certificate or marks learner completed', async () => {
    const { db, service } = setup();
    teacher(db);
    db.course_enrollments.findFirst.mockResolvedValue(enrollment);
    await service.reviewCompletion('teacher', 'enrollment', {
      decision: 'REJECT',
      note: 'Please revisit the practical lesson',
    });
    expect(db.certificates.create).not.toHaveBeenCalled();
    expect(
      db.course_enrollments.updateMany.mock.calls[0][0].data.status,
    ).toBeUndefined();
  });
  it('private library and transfer history are scoped to the current authenticated user', async () => {
    const { db, service } = setup();
    await service.library('learner');
    await service.myPayments('learner');
    expect(db.course_enrollments.findMany.mock.calls[0][0].where).toEqual({
      user_id: 'learner',
    });
    expect(db.course_payment_requests.findMany.mock.calls[0][0].where).toEqual({
      user_id: 'learner',
    });
  });
});
describe('Validation and endpoint roles', () => {
  it('accepts only actual YouTube video URLs and exact cents', () => {
    for (const url of [
      'https://youtu.be/5BciHXh074k',
      'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    ])
      expect(() => requireYoutube(url)).not.toThrow();
    for (const url of [
      'javascript:alert(1)',
      'https://youtube.com.evil.test/watch?v=5BciHXh074k',
      'https://youtu.be/playlist',
      'https://example.com/video',
    ])
      expect(() => requireYoutube(url)).toThrow(BadRequestException);
    expect(cents('125.50')).toBe(12550);
    for (const amount of [-1, NaN, Infinity, 1.234, 1000001])
      expect(() => cents(amount)).toThrow();
    expect(normalizedReference(' ref - 1 ')).toBe('REF-1');
  });
  it('protects author/admin actions with explicit roles', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        CourseWorkflowController.prototype.createCourse,
      ),
    ).toEqual(['TRAINER']);
    for (const method of [
      'reviewCourse',
      'reviewPayment',
      'saveSettings',
    ] as const)
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          CourseWorkflowController.prototype[method],
        ),
      ).toEqual(['ADMIN', 'SUPER_ADMIN']);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        CourseWorkflowController.prototype.complete,
      ),
    ).toEqual(['TRAINER']);
  });
  it('rejects spoofed privileges, fractional cents, malformed dates and invalid decisions at DTO boundary', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    for (const [metatype, value] of [
      [TransferReportDto, { ...report(), status: 'APPROVED' }],
      [TransferReportDto, { ...report(), reported_amount: 125.555 }],
      [TransferReportDto, { ...report(), transferred_at: 'not-a-date' }],
      [PaymentDecisionDto, { decision: 'APPROVED' }],
    ] as const)
      await expect(
        pipe.transform(value, { type: 'body', metatype }),
      ).rejects.toBeInstanceOf(BadRequestException);
  });
});

it('saves catalog summaries, content type, category and ordered lesson descriptions under the current instructor', async () => {
  const { db, service } = setup();
  teacher(db);
  db.course_categories.findFirst.mockResolvedValue({
    id: 'subcategory',
    parent_id: 'category',
  });
  db.courses.create.mockResolvedValue({ id: 'new' });
  db.course_sections.create.mockResolvedValue({ id: 'chapter' });
  const draft = {
    title_ar: 'عنوان الكورس',
    title_en: 'Real Course',
    description_ar: 'وصف الكورس',
    description_en: 'Course description',
    short_description_ar: 'نبذة البطاقة',
    short_description_en: 'Card summary',
    content_type: 'PODCOURSE',
    category_id: 'subcategory',
    preview_video_url: 'https://youtu.be/5BciHXh074k',
    price: 100,
    language: 'ar',
    level: 'BEGINNER',
    sections: [
      {
        title_ar: 'جزء',
        title_en: 'Chapter',
        lessons: [
          {
            title_ar: 'درس أول',
            title_en: 'First lesson',
            description_ar: 'وصف الدرس',
            description_en: 'Lesson description',
            media_url: '',
            duration_minutes: 10,
            is_preview: false,
          },
          {
            title_ar: 'درس ثان',
            title_en: 'Second lesson',
            media_url: 'https://youtu.be/5BciHXh074k',
            duration_minutes: 20,
            is_preview: true,
          },
        ],
      },
    ],
  } as CourseDraftDto;
  await service.saveCourse('teacher', draft);
  expect(db.courses.create.mock.calls[0][0].data).toMatchObject({
    owner_trainer_id: 'trainer',
    status: 'DRAFT',
    review_status: 'DRAFT',
    price: 100,
    content_type: 'PODCOURSE',
    short_description_ar: 'نبذة البطاقة',
    duration_minutes: 30,
    lessons_count: 2,
  });
  expect(
    db.course_category_links.create.mock.calls[0][0].data.category_id,
  ).toBe('subcategory');
  expect(
    db.course_lessons.createMany.mock.calls[0][0].data.map((l: any) => [
      l.position,
      l.description_ar,
    ]),
  ).toEqual([
    [0, 'وصف الدرس'],
    [1, undefined],
  ]);
  expect(db.course_categories.findFirst.mock.calls[1][0].where).toEqual({
    id: 'category',
    parent_id: null,
    is_active: true,
  });
  expect(db.notifications.createMany).not.toHaveBeenCalled();
});

it('rejects an inactive or missing subcategory parent before writing a draft', async () => {
  const { db, service } = setup();
  teacher(db);
  db.course_categories.findFirst
    .mockResolvedValueOnce({ id: 'child', parent_id: 'parent' })
    .mockResolvedValueOnce(null);
  await expect(
    service.saveCourse('teacher', {
      category_id: 'child',
      sections: [],
      title_ar: 'عنوان الكورس',
      title_en: 'Course title',
      description_ar: '',
      description_en: '',
      preview_video_url: '',
      price: 0,
      language: 'ar',
      level: 'BEGINNER',
    }),
  ).rejects.toBeInstanceOf(BadRequestException);
  expect(db.courses.create).not.toHaveBeenCalled();
});
it('a draft with unfinished lesson video cannot be submitted or notify administrators', async () => {
  const { db, service } = setup();
  teacher(db);
  db.courses.findFirst.mockResolvedValue({
    ...course,
    status: 'DRAFT',
    review_status: 'DRAFT',
  });
  db.course_sections.findMany.mockResolvedValue([
    { lessons: [{ media_url: '', duration_minutes: 10 }] },
  ]);
  await expect(
    service.submitCourse('teacher', 'course'),
  ).rejects.toBeInstanceOf(BadRequestException);
  expect(db.courses.updateMany).not.toHaveBeenCalled();
  expect(db.notifications.createMany).not.toHaveBeenCalled();
});

it('submission reports deterministic nested description/video/duration paths before changing state', async () => {
  const { db, service } = setup();
  teacher(db);
  db.courses.findFirst.mockResolvedValue({
    ...course,
    status: 'DRAFT',
    review_status: 'DRAFT',
    description_en: '',
  });
  db.course_sections.findMany.mockResolvedValue([
    {
      lessons: [
        { media_url: '', duration_minutes: 0 },
        { media_url: course.preview_video_url, duration_minutes: -1 },
      ],
    },
  ]);
  const result = await service
    .submitCourse('teacher', 'course')
    .catch((error) => error.getResponse());
  expect(Object.keys(result.field_errors).sort()).toEqual([
    'description_en',
    'sections.0.lessons.0.duration_minutes',
    'sections.0.lessons.0.media_url',
    'sections.0.lessons.1.duration_minutes',
  ]);
  expect(db.course_sections.findMany).toHaveBeenCalledWith({
    where: { course_id: 'course' },
    orderBy: { position: 'asc' },
    include: { lessons: { orderBy: { position: 'asc' } } },
  });
  expect(db.courses.updateMany).not.toHaveBeenCalled();
  expect(db.notifications.createMany).not.toHaveBeenCalled();
});
