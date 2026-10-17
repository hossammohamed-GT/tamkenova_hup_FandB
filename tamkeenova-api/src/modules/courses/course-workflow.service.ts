import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Prisma, course_level } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { certificateData } from '../admin/certificate-data';
import {
  cents,
  normalizedReference,
  requireNote,
  requireYoutube,
  transactionOptions,
} from './course-workflow.rules';
import {
  CheckoutSettingsDto,
  CompletionDecisionDto,
  CompletionRequestDto,
  CourseDecisionDto,
  CourseDraftDto,
  PaymentDecisionDto,
  TransferReportDto,
} from './dto/course-workflow.dto';
type Tx = Prisma.TransactionClient;
const summary = {
  id: true,
  slug: true,
  title_ar: true,
  title_en: true,
  price: true,
  is_free: true,
  status: true,
  review_status: true,
  revision: true,
  review_note: true,
  cover_image_url: true,
  duration_minutes: true,
  lessons_count: true,
  owner_trainer_id: true,
} as const;
const person = { id: true, full_name: true, email: true } as const;
@Injectable()
export class CourseWorkflowService {
  constructor(private readonly db: PrismaService) {}
  private async mutate<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.db.$transaction(operation, transactionOptions);
    } catch (error) {
      if (['P2002', 'P2034'].includes((error as { code?: string }).code || ''))
        throw new ConflictException(
          'This request was already handled or changed. Refresh / الطلب اتراجع أو اتغير، حدّث الصفحة',
        );
      throw error;
    }
  }
  private async trainer(tx: Tx, userId: string) {
    const trainer = await tx.trainers.findFirst({
      where: { user_id: userId, trainer_status: 'APPROVED' },
      include: { users: { select: person } },
    });
    if (!trainer)
      throw new ForbiddenException(
        'Approved trainer required / يلزم اعتماد حساب الأستاذ',
      );
    return trainer;
  }
  private async owned(tx: Tx, userId: string, id: string) {
    const trainer = await this.trainer(tx, userId);
    const course = await tx.courses.findFirst({
      where: { id, owner_trainer_id: trainer.id },
    });
    if (!course) throw new NotFoundException('Course not found');
    return { trainer, course };
  }
  private async log(
    tx: Tx,
    userId: string,
    action: string,
    id: string,
    details?: string,
  ) {
    await tx.activity_logs.create({
      data: {
        user_id: userId,
        action,
        entity_type: 'COURSE_WORKFLOW',
        entity_id: id,
        details,
      },
    });
  }
  private async notify(
    tx: Tx,
    userIds: string[],
    title: string,
    message: string,
    type: string,
    id: string,
    reference_type: string,
  ) {
    if (userIds.length)
      await tx.notifications.createMany({
        data: [...new Set(userIds)].map((user_id) => ({
          user_id,
          title,
          message,
          type,
          reference_id: id,
          reference_type,
        })),
      });
  }
  private async notifyAdmins(
    tx: Tx,
    title: string,
    message: string,
    type: string,
    id: string,
    ref: string,
  ) {
    const admins = await tx.users.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, is_active: true },
      select: { id: true },
    });
    await this.notify(
      tx,
      admins.map((a) => a.id),
      title,
      message,
      type,
      id,
      ref,
    );
  }
  private async activeEnrollment(tx: Tx, userId: string, courseId: string) {
    const row = await tx.course_enrollments.findFirst({
      where: {
        user_id: userId,
        course_id: courseId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });
    if (!row)
      throw new ForbiddenException(
        'Enroll in this course first / يلزم التسجيل في الكورس أولًا',
      );
    return row;
  }
  async trainerCourses(userId: string) {
    const trainer = await this.trainer(this.db, userId);
    return this.db.courses.findMany({
      where: { owner_trainer_id: trainer.id },
      select: summary,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
  async courseForReview(id: string, userId?: string) {
    if (userId) await this.owned(this.db, userId, id);
    const course = await this.db.courses.findUnique({
      where: { id },
      include: {
        owner: { include: { users: { select: person } } },
        category_links: true,
        sections: {
          orderBy: { position: 'asc' },
          include: { lessons: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }
  async saveCourse(userId: string, dto: CourseDraftDto, id?: string) {
    if (
      dto.sections.reduce(
        (count, section) => count + section.lessons.length,
        0,
      ) > 500
    )
      throw new BadRequestException('A course supports up to 500 lessons');
    if (dto.preview_video_url) requireYoutube(dto.preview_video_url);
    if (
      dto.cover_image_url &&
      !/^https:\/\/[^\s]+$|^\/(?!\/)[^\s]*$/.test(dto.cover_image_url)
    )
      throw new BadRequestException('Invalid cover URL');
    for (const section of dto.sections)
      for (const lesson of section.lessons) requireYoutube(lesson.media_url);
    return this.mutate(async (tx) => {
      const trainer = await this.trainer(tx, userId);
      let original:
        | Awaited<ReturnType<CourseWorkflowService['owned']>>['course']
        | undefined;
      if (id) {
        const { course } = await this.owned(tx, userId, id);
        if (
          course.status === 'PUBLISHED' ||
          course.review_status === 'PENDING' ||
          (await tx.course_enrollments.count({ where: { course_id: id } }))
        )
          throw new ConflictException(
            'Published, submitted or enrolled courses cannot be edited / لا يمكن تعديل كورس منشور أو قيد المراجعة أو عليه طلاب',
          );
        original = course;
      }
      const category = await tx.course_categories.findFirst({
        where: { id: dto.category_id, is_active: true },
      });
      if (!category) throw new BadRequestException('Select an active category');
      const lessons = dto.sections.flatMap((s) => s.lessons);
      const duration = lessons.reduce((n, l) => n + l.duration_minutes, 0);
      const data = {
        title_ar: dto.title_ar.trim(),
        title_en: dto.title_en.trim(),
        description_ar: dto.description_ar,
        description_en: dto.description_en,
        short_description_ar: dto.description_ar.slice(0, 200),
        short_description_en: dto.description_en.slice(0, 200),
        preview_video_url: dto.preview_video_url || null,
        cover_image_url: dto.cover_image_url || null,
        language: dto.language,
        level: dto.level as course_level,
        price: dto.price,
        is_free: cents(dto.price) === 0,
        status: 'DRAFT' as const,
        review_status: 'DRAFT',
        review_note: null,
        duration_minutes: duration,
        lessons_count: lessons.length,
      };
      if (id) {
        const changed = await tx.courses.updateMany({
          where: {
            id,
            status: 'DRAFT',
            review_status: original!.review_status,
            revision: original!.revision,
          },
          data: { ...data, revision: { increment: 1 } },
        });
        if (!changed.count)
          throw new ConflictException('Draft changed; refresh');
      }
      const course = id
        ? await tx.courses.findUniqueOrThrow({ where: { id } })
        : await tx.courses.create({
            data: {
              ...data,
              owner_trainer_id: trainer.id,
              slug: `${dto.title_en
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .slice(0, 100)}-${randomUUID().slice(0, 8)}`,
            },
          });
      if (id) {
        await tx.course_lessons.deleteMany({ where: { course_id: id } });
        await tx.course_sections.deleteMany({ where: { course_id: id } });
        await tx.course_category_links.deleteMany({ where: { course_id: id } });
      }
      await tx.course_category_links.create({
        data: {
          course_id: course.id,
          category_id: dto.category_id,
          is_primary: true,
        },
      });
      if (!id)
        await tx.course_instructors.create({
          data: {
            course_id: course.id,
            trainer_id: trainer.id,
            is_primary: true,
          },
        });
      let position = 0;
      for (let index = 0; index < dto.sections.length; index++) {
        const section = dto.sections[index];
        const created = await tx.course_sections.create({
          data: {
            course_id: course.id,
            title_ar: section.title_ar,
            title_en: section.title_en,
            position: index,
          },
        });
        if (section.lessons.length)
          await tx.course_lessons.createMany({
            data: section.lessons.map((l) => ({
              ...l,
              course_id: course.id,
              section_id: created.id,
              position: position++,
              is_active: true,
            })),
          });
      }
      await this.log(
        tx,
        userId,
        id ? 'COURSE_DRAFT_UPDATED' : 'COURSE_DRAFT_CREATED',
        course.id,
      );
      return course;
    });
  }
  async submitCourse(userId: string, id: string) {
    return this.mutate(async (tx) => {
      const { course } = await this.owned(tx, userId, id);
      if (
        course.status !== 'DRAFT' ||
        !['DRAFT', 'REJECTED'].includes(course.review_status)
      )
        throw new ConflictException('Course cannot be submitted in this state');
      certificateData({
        certificate_type: 'TRAINING',
        recipient_name_ar: 'متعلّم',
        recipient_name_en: 'Learner',
        program_name_ar: course.title_ar,
        program_name_en: course.title_en,
        signature_name: 'Instructor',
        training_hours: Math.max(1, Math.ceil(course.duration_minutes / 60)),
        issued_at: new Date().toISOString().slice(0, 10),
      });
      requireYoutube(course.preview_video_url || '');
      if (!course.description_ar?.trim() || !course.description_en?.trim())
        throw new BadRequestException('Both course descriptions are required');
      const sections = await tx.course_sections.findMany({
        where: { course_id: id },
        include: { lessons: true },
      });
      if (!sections.length || sections.some((s) => !s.lessons.length))
        throw new BadRequestException('Every chapter must contain a lesson');
      for (const section of sections)
        for (const lesson of section.lessons) {
          requireYoutube(lesson.media_url || '');
          if (lesson.duration_minutes < 1)
            throw new BadRequestException('Set lesson durations');
        }
      const changed = await tx.courses.updateMany({
        where: {
          id,
          revision: course.revision,
          review_status: course.review_status,
          status: 'DRAFT',
        },
        data: { review_status: 'PENDING', review_note: null },
      });
      if (!changed.count)
        throw new ConflictException('Course changed; refresh');
      await this.notifyAdmins(
        tx,
        'كورس جديد للمراجعة / Course submitted',
        course.title_ar,
        'COURSE_SUBMITTED',
        id,
        'COURSE_REVIEW',
      );
      await this.log(tx, userId, 'COURSE_SUBMITTED', id);
      return { submitted: true };
    });
  }
  async adminCourses(status?: string) {
    if (
      status &&
      !['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'].includes(status)
    )
      throw new BadRequestException('Invalid filter');
    return this.db.courses.findMany({
      where: {
        owner_trainer_id: { not: null },
        ...(status ? { review_status: status } : {}),
      },
      select: { ...summary, owner: { select: { users: { select: person } } } },
      orderBy: { updated_at: 'desc' },
      take: 100,
    });
  }
  async reviewCourse(adminId: string, id: string, dto: CourseDecisionDto) {
    return this.mutate(async (tx) => {
      const course = await tx.courses.findUnique({
        where: { id },
        include: { owner: true },
      });
      if (!course?.owner)
        throw new NotFoundException('Authored course not found');
      if (course.owner.user_id === adminId)
        throw new ForbiddenException('You cannot approve your own course');
      if (
        dto.decision === 'APPROVE' &&
        course.owner.trainer_status !== 'APPROVED'
      )
        throw new BadRequestException('Trainer is not approved');
      const note =
        dto.decision === 'REJECT' ? requireNote(dto.note) : dto.note?.trim();
      const changed = await tx.courses.updateMany({
        where: {
          id,
          revision: dto.revision,
          status: 'DRAFT',
          review_status: 'PENDING',
        },
        data: {
          status: dto.decision === 'APPROVE' ? 'PUBLISHED' : 'DRAFT',
          review_status: dto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          review_note: note,
          reviewed_by: adminId,
          reviewed_at: new Date(),
          ...(dto.decision === 'APPROVE' ? { published_at: new Date() } : {}),
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'Another admin already reviewed this version',
        );
      await this.notify(
        tx,
        [course.owner.user_id],
        'نتيجة مراجعة الكورس / Course review',
        `${course.title_ar}: ${dto.decision}${note ? ' — ' + note : ''}`,
        'COURSE_REVIEWED',
        id,
        'COURSE_AUTHOR',
      );
      await this.log(tx, adminId, `COURSE_${dto.decision}`, id, note);
      return { reviewed: true };
    });
  }
  async settings() {
    return (
      (await this.db.course_checkout_settings.findUnique({
        where: { id: 'default' },
        select: {
          enabled: true,
          vodafone_cash: true,
          instapay: true,
          instructions_ar: true,
          instructions_en: true,
        },
      })) ?? {
        enabled: false,
        vodafone_cash: '',
        instapay: '',
        instructions_ar: '',
        instructions_en: '',
      }
    );
  }
  async saveSettings(adminId: string, dto: CheckoutSettingsDto) {
    const wallet = dto.vodafone_cash?.trim() || null,
      instapay = dto.instapay?.trim() || null;
    const phone = /^(?:0|\+?20)1[0125]\d{8}$/;
    if (wallet && !phone.test(wallet))
      throw new BadRequestException('Invalid Vodafone Cash phone number');
    if (
      instapay &&
      !phone.test(instapay) &&
      !/^[-\w.+]+@[\w.-]+$/.test(instapay)
    )
      throw new BadRequestException('Invalid InstaPay address or phone');
    if (dto.enabled && !wallet && !instapay)
      throw new BadRequestException(
        'Add a receiving account before enabling payments',
      );
    return this.mutate(async (tx) => {
      const data = {
        ...dto,
        vodafone_cash: wallet,
        instapay,
        updated_by: adminId,
      };
      const result = await tx.course_checkout_settings.upsert({
        where: { id: 'default' },
        create: { id: 'default', ...data },
        update: data,
      });
      await this.log(tx, adminId, 'COURSE_PAYMENT_SETTINGS_UPDATED', adminId);
      return result;
    });
  }
  private async preventSelfEnrollment(
    tx: Tx,
    userId: string,
    trainerId: string | null,
  ) {
    if (
      trainerId &&
      (await tx.trainers.findFirst({
        where: { id: trainerId, user_id: userId },
        select: { id: true },
      }))
    )
      throw new ForbiddenException(
        'You cannot enroll in or certify your own course / لا يمكن التسجيل أو إصدار شهادة لنفسك في كورسك',
      );
  }
  async checkout(userId: string, courseId: string) {
    const course = await this.db.courses.findFirst({
      where: { id: courseId, status: 'PUBLISHED' },
      select: summary,
    });
    if (!course) throw new NotFoundException('Course not found');
    await this.preventSelfEnrollment(this.db, userId, course.owner_trainer_id);
    const enrollment = await this.db.course_enrollments.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });
    const requests = await this.db.course_payment_requests.findMany({
      where: { user_id: userId, course_id: courseId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
    const settings = await this.settings();
    const methods = [
      ...(settings.vodafone_cash
        ? [{ method: 'VODAFONE_CASH', account: settings.vodafone_cash }]
        : []),
      ...(settings.instapay
        ? [{ method: 'INSTAPAY', account: settings.instapay }]
        : []),
    ];
    const enabled =
      settings.enabled &&
      methods.length > 0 &&
      !course.is_free &&
      cents(course.price) > 0;
    const quote_token = enabled
      ? jwt.sign(
          {
            kind: 'COURSE_PAYMENT_QUOTE',
            user_id: userId,
            course_id: courseId,
            amount_cents: cents(course.price),
            methods,
          },
          process.env.JWT_SECRET!,
          {
            expiresIn: '24h',
            audience: 'course-checkout',
            issuer: 'tamkeenova',
          },
        )
      : null;
    return {
      course,
      enrollment,
      requests,
      payment_enabled: enabled,
      methods: enabled ? methods : [],
      instructions_ar: settings.instructions_ar,
      instructions_en: settings.instructions_en,
      quote_token,
    };
  }
  async reportTransfer(
    userId: string,
    courseId: string,
    dto: TransferReportDto,
  ) {
    if (dto.sender_account.trim().length < 3)
      throw new BadRequestException('Enter the actual sender number/account');
    let quote: {
      kind: string;
      user_id: string;
      course_id: string;
      amount_cents: number;
      methods: { method: string; account: string }[];
    };
    try {
      quote = jwt.verify(dto.quote_token, process.env.JWT_SECRET!, {
        audience: 'course-checkout',
        issuer: 'tamkeenova',
        algorithms: ['HS256'],
      }) as typeof quote;
    } catch {
      throw new BadRequestException(
        'Payment quote expired. Do not pay again; contact support if you already transferred / عرض الدفع انتهى. لو حوّلت بالفعل لا تحول مرة ثانية وتواصل مع الإدارة',
      );
    }
    if (
      quote.kind !== 'COURSE_PAYMENT_QUOTE' ||
      quote.user_id !== userId ||
      quote.course_id !== courseId ||
      !Number.isInteger(quote.amount_cents) ||
      quote.amount_cents < 1
    )
      throw new BadRequestException('Invalid payment quote');
    const destination = quote.methods.find((m) => m.method === dto.method);
    if (!destination)
      throw new BadRequestException('Payment method is not available');
    if (new Date(dto.transferred_at).getTime() > Date.now() + 300000)
      throw new BadRequestException('Transfer time cannot be in the future');
    return this.mutate(async (tx) => {
      const course = await tx.courses.findFirst({
        where: { id: courseId, status: 'PUBLISHED' },
      });
      if (!course) throw new NotFoundException('Course not available');
      await this.preventSelfEnrollment(tx, userId, course.owner_trainer_id);
      const enrollment = await tx.course_enrollments.findFirst({
        where: {
          user_id: userId,
          course_id: courseId,
          status: { in: ['ACTIVE', 'COMPLETED'] },
        },
      });
      if (enrollment)
        throw new ConflictException('Already enrolled; do not pay again');
      const pending = await tx.course_payment_requests.findFirst({
        where: { user_id: userId, course_id: courseId, status: 'PENDING' },
      });
      if (pending) return pending;
      const payment = await tx.course_payment_requests.create({
        data: {
          user_id: userId,
          course_id: courseId,
          method: dto.method,
          recipient_account: destination.account,
          expected_amount: quote.amount_cents / 100,
          reported_amount: dto.reported_amount,
          sender_account: dto.sender_account.trim(),
          transfer_reference: dto.transfer_reference?.trim(),
          transferred_at: new Date(dto.transferred_at),
          notes: dto.notes,
        },
      });
      await this.notifyAdmins(
        tx,
        'تحويل جديد للمراجعة / Transfer reported',
        `${course.title_ar} — ${dto.reported_amount} EGP`,
        'COURSE_PAYMENT_PENDING',
        payment.id,
        'COURSE_PAYMENT',
      );
      await this.log(tx, userId, 'COURSE_PAYMENT_REPORTED', payment.id);
      return payment;
    });
  }
  async adminPayments(status = 'PENDING') {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status))
      throw new BadRequestException('Invalid status');
    return this.db.course_payment_requests.findMany({
      where: { status },
      include: { users: { select: person }, courses: { select: summary } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
  async reviewPayment(adminId: string, id: string, dto: PaymentDecisionDto) {
    return this.mutate(async (tx) => {
      const payment = await tx.course_payment_requests.findUnique({
        where: { id },
        include: { courses: true },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.user_id === adminId)
        throw new ForbiddenException('Another admin must review your payment');
      if (payment.status !== 'PENDING')
        throw new ConflictException('Payment already reviewed');
      let reference: string | undefined;
      const note =
        dto.decision === 'REJECT' ? requireNote(dto.note) : dto.note?.trim();
      if (dto.decision === 'APPROVE') {
        reference = normalizedReference(dto.confirmed_reference);
        if (
          dto.confirmed_amount === undefined ||
          cents(dto.confirmed_amount) !== cents(payment.expected_amount)
        )
          throw new BadRequestException(
            'Confirm the exact received course price / المبلغ المستلم يجب أن يساوي سعر الطلب',
          );
        if (payment.courses.status !== 'PUBLISHED')
          throw new ConflictException(
            'Course is not published; review/refund the transfer manually',
          );
        const enrolled = await tx.course_enrollments.findFirst({
          where: {
            user_id: payment.user_id,
            course_id: payment.course_id,
            status: { in: ['ACTIVE', 'COMPLETED'] },
          },
        });
        if (enrolled)
          throw new ConflictException(
            'Already enrolled. Review this transfer manually.',
          );
      }
      const changed = await tx.course_payment_requests.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: dto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          reviewed_by: adminId,
          reviewed_at: new Date(),
          review_note: note,
          confirmed_reference: reference,
          confirmed_amount:
            dto.decision === 'APPROVE' ? dto.confirmed_amount : null,
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'Another admin already reviewed this payment',
        );
      if (dto.decision === 'APPROVE') {
        const priorEnrollment = await tx.course_enrollments.findUnique({
          where: {
            user_id_course_id: {
              user_id: payment.user_id,
              course_id: payment.course_id,
            },
          },
        });
        await tx.course_enrollments.upsert({
          where: {
            user_id_course_id: {
              user_id: payment.user_id,
              course_id: payment.course_id,
            },
          },
          create: { user_id: payment.user_id, course_id: payment.course_id },
          update: { status: 'ACTIVE' },
        });
        if (!priorEnrollment)
          await tx.courses.update({
            where: { id: payment.course_id },
            data: { enrollments_count: { increment: 1 } },
          });
      }
      await this.notify(
        tx,
        [payment.user_id],
        'نتيجة مراجعة التحويل / Payment review',
        `${payment.courses.title_ar}: ${dto.decision}${note ? ' — ' + note : ''}`,
        'COURSE_PAYMENT_REVIEWED',
        payment.course_id,
        'COURSE_LEARNING',
      );
      await this.log(tx, adminId, `COURSE_PAYMENT_${dto.decision}`, id, note);
      return { reviewed: true };
    });
  }
  async enrollFree(userId: string, courseId: string) {
    return this.mutate(async (tx) => {
      const course = await tx.courses.findFirst({
        where: { id: courseId, status: 'PUBLISHED', is_free: true, price: 0 },
      });
      if (!course)
        throw new BadRequestException(
          'This course requires payment approval or is unavailable',
        );
      await this.preventSelfEnrollment(tx, userId, course.owner_trainer_id);
      const existing = await tx.course_enrollments.findUnique({
        where: { user_id_course_id: { user_id: userId, course_id: courseId } },
      });
      if (existing) {
        if (existing.status === 'CANCELLED')
          return tx.course_enrollments.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE' },
          });
        return existing;
      }
      const enrollment = await tx.course_enrollments.create({
        data: { user_id: userId, course_id: courseId },
      });
      await tx.courses.update({
        where: { id: courseId },
        data: { enrollments_count: { increment: 1 } },
      });
      await this.log(tx, userId, 'COURSE_FREE_ENROLLED', courseId);
      return enrollment;
    });
  }
  async myPayments(userId: string) {
    return this.db.course_payment_requests.findMany({
      where: { user_id: userId },
      include: { courses: { select: summary } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
  async library(userId: string) {
    return this.db.course_enrollments.findMany({
      where: { user_id: userId },
      include: { courses: { select: summary }, certificate: true },
      orderBy: { enrolled_at: 'desc' },
      take: 100,
    });
  }
  async learning(userId: string, courseId: string) {
    const enrollment = await this.activeEnrollment(this.db, userId, courseId);
    return this.db.course_enrollments.findUnique({
      where: { id: enrollment.id },
      include: { lesson_progress: true, certificate: true },
    });
  }
  async markLesson(userId: string, courseId: string, lessonId: string) {
    return this.mutate(async (tx) => {
      const enrollment = await this.activeEnrollment(tx, userId, courseId);
      if (enrollment.status === 'COMPLETED') return { progress: 100 };
      // Lock this enrollment before counting progress: simultaneous lesson marks cannot overwrite a newer percentage.
      const locked = await tx.course_enrollments.updateMany({
        where: { id: enrollment.id, status: 'ACTIVE' },
        data: { last_accessed_at: new Date() },
      });
      if (!locked.count)
        throw new ConflictException('Enrollment changed; refresh');
      const lesson = await tx.course_lessons.findFirst({
        where: { id: lessonId, course_id: courseId, is_active: true },
      });
      if (!lesson) throw new NotFoundException('Lesson not found');
      await tx.course_lesson_progress.upsert({
        where: {
          enrollment_id_lesson_id: {
            enrollment_id: enrollment.id,
            lesson_id: lessonId,
          },
        },
        create: { enrollment_id: enrollment.id, lesson_id: lessonId },
        update: {},
      });
      const count = await tx.course_lessons.count({
        where: { course_id: courseId, is_active: true },
      });
      const done = await tx.course_lesson_progress.count({
        where: {
          enrollment_id: enrollment.id,
          lesson: { course_id: courseId, is_active: true },
        },
      });
      const progress = count ? Math.floor((done * 100) / count) : 0;
      await tx.course_enrollments.update({
        where: { id: enrollment.id },
        data: { progress, last_accessed_at: new Date() },
      });
      return { progress };
    });
  }
  async requestCompletion(
    userId: string,
    courseId: string,
    dto: CompletionRequestDto,
  ) {
    return this.mutate(async (tx) => {
      const enrollment = await this.activeEnrollment(tx, userId, courseId);
      const course = await tx.courses.findUnique({
        where: { id: courseId },
        include: { owner: true },
      });
      if (!course?.owner)
        throw new BadRequestException(
          'This legacy/demo course has no assigned instructor',
        );
      await this.preventSelfEnrollment(tx, userId, course.owner.id);
      if (course.owner.trainer_status !== 'APPROVED')
        throw new BadRequestException(
          'Your instructor is unavailable; contact the administration',
        );
      if (enrollment.status === 'COMPLETED')
        throw new ConflictException('Certificate already issued');
      const count = await tx.course_lessons.count({
        where: { course_id: courseId, is_active: true },
      });
      const done = await tx.course_lesson_progress.count({
        where: {
          enrollment_id: enrollment.id,
          lesson: { course_id: courseId, is_active: true },
        },
      });
      if (!count || done !== count)
        throw new BadRequestException(
          'Finish and mark every lesson first / أكمل كل الدروس أولًا',
        );
      // Validate template input before queuing an unfulfillable certificate request.
      certificateData({
        certificate_type: 'TRAINING',
        recipient_name_ar: dto.recipient_name_ar,
        recipient_name_en: dto.recipient_name_en,
        program_name_ar: course.title_ar,
        program_name_en: course.title_en,
        signature_name: 'Instructor',
        training_hours: Math.max(1, Math.ceil(course.duration_minutes / 60)),
        issued_at: new Date().toISOString().slice(0, 10),
      });
      const changed = await tx.course_enrollments.updateMany({
        where: {
          id: enrollment.id,
          status: 'ACTIVE',
          completion_state: { in: ['NOT_REQUESTED', 'REJECTED'] },
        },
        data: {
          ...dto,
          completion_state: 'PENDING',
          completion_requested_at: new Date(),
          completion_note: null,
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'Completion request is already under review',
        );
      await this.notify(
        tx,
        [course.owner.user_id],
        'طلب اعتماد إتمام / Completion requested',
        course.title_ar,
        'COURSE_COMPLETION_PENDING',
        enrollment.id,
        'COURSE_COMPLETION',
      );
      return { requested: true };
    });
  }
  async trainerCompletions(userId: string) {
    const trainer = await this.trainer(this.db, userId);
    return this.db.course_enrollments.findMany({
      where: {
        courses: { owner_trainer_id: trainer.id },
        completion_state: 'PENDING',
      },
      include: {
        users: { select: person },
        courses: { select: summary },
        lesson_progress: true,
      },
      orderBy: { completion_requested_at: 'asc' },
      take: 100,
    });
  }
  async reviewCompletion(
    userId: string,
    id: string,
    dto: CompletionDecisionDto,
  ) {
    return this.mutate(async (tx) => {
      const trainer = await this.trainer(tx, userId);
      const enrollment = await tx.course_enrollments.findFirst({
        where: { id, courses: { owner_trainer_id: trainer.id } },
        include: {
          courses: true,
          users: { select: person },
          certificate: true,
        },
      });
      if (!enrollment)
        throw new NotFoundException('Completion request not found');
      if (enrollment.user_id === userId)
        throw new ForbiddenException('You cannot certify your own enrollment');
      if (enrollment.certificate)
        return { certificate: enrollment.certificate };
      const note =
        dto.decision === 'REJECT' ? requireNote(dto.note) : dto.note?.trim();
      const changed = await tx.course_enrollments.updateMany({
        where: { id, status: 'ACTIVE', completion_state: 'PENDING' },
        data: {
          completion_state:
            dto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          completion_reviewed_by: userId,
          completion_note: note,
          ...(dto.decision === 'APPROVE'
            ? { status: 'COMPLETED', progress: 100, completed_at: new Date() }
            : {}),
        },
      });
      if (!changed.count)
        throw new ConflictException('Completion was already reviewed');
      let certificate;
      if (dto.decision === 'APPROVE') {
        const active = await tx.course_lessons.count({
            where: { course_id: enrollment.course_id, is_active: true },
          }),
          done = await tx.course_lesson_progress.count({
            where: {
              enrollment_id: id,
              lesson: { course_id: enrollment.course_id, is_active: true },
            },
          });
        if (!active || active !== done)
          throw new ConflictException(
            'Course completion records changed; review again',
          );
        const data = certificateData({
          certificate_type: 'TRAINING',
          recipient_name_ar: enrollment.recipient_name_ar,
          recipient_name_en: enrollment.recipient_name_en,
          program_name_ar: enrollment.courses.title_ar,
          program_name_en: enrollment.courses.title_en,
          signature_name: dto.signature_name || trainer.users.full_name,
          training_hours: Math.max(
            1,
            Math.ceil(enrollment.courses.duration_minutes / 60),
          ),
          issued_at: new Date().toISOString().slice(0, 10),
        });
        certificate = await tx.certificates.create({
          data: {
            ...data,
            student_id: enrollment.user_id,
            trainer_id: trainer.id,
            course_id: enrollment.course_id,
            course_enrollment_id: id,
            verification_code: randomBytes(10).toString('hex').toUpperCase(),
          },
        });
        await this.notify(
          tx,
          [enrollment.user_id],
          'شهادتك جاهزة / Certificate issued',
          enrollment.courses.title_ar,
          'CERTIFICATE_ISSUED',
          certificate.id,
          'COURSE_CERTIFICATE',
        );
      } else
        await this.notify(
          tx,
          [enrollment.user_id],
          'مراجعة إتمام الكورس / Completion review',
          note!,
          'COURSE_COMPLETION_REJECTED',
          enrollment.course_id,
          'COURSE_LEARNING',
        );
      await this.log(tx, userId, `COURSE_COMPLETION_${dto.decision}`, id, note);
      return { certificate: certificate ?? null };
    });
  }
}
