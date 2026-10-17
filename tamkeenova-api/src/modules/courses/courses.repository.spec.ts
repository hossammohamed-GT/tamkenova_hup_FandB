import { describe, expect, it, jest } from '@jest/globals';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CoursesRepository } from './courses.repository';
import { CoursesController } from './courses.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
describe('Course playback query boundaries', () => {
  it('scopes playback to the published course, active lesson, current user and valid enrollment', async () => {
    const findFirst = jest
      .fn<(...args: any[]) => Promise<any>>()
      .mockResolvedValue(null);
    const repository = new CoursesRepository({
      courses: { findFirst },
      course_lessons: { findFirst },
    } as unknown as PrismaService);
    await repository.getCourseAccess('course', 'student');
    const access = findFirst.mock.calls[0][0];
    expect(access.where).toEqual({ slug: 'course', status: 'PUBLISHED' });
    expect(access.select.enrollments.where).toEqual({
      user_id: 'student',
      status: { in: ['ACTIVE', 'COMPLETED'] },
    });
    await repository.getLessonPlayback('course', 'lesson', 'student');
    const query = findFirst.mock.calls[1][0];
    expect(query.where).toEqual({
      id: 'lesson',
      is_active: true,
      courses: { slug: 'course', status: 'PUBLISHED' },
    });
    expect(query.select.courses.select.enrollments.where).toEqual({
      user_id: 'student',
      status: { in: ['ACTIVE', 'COMPLETED'] },
    });
  });
  it('guards both membership endpoints with JWT', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        CoursesController.prototype.getCourseAccess,
      ),
    ).toContain(JwtAuthGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        CoursesController.prototype.getLessonPlayback,
      ),
    ).toContain(JwtAuthGuard);
  });
});
