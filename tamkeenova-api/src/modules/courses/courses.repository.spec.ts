import { publicCourseWhere } from './public-course-policy';
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
    expect(access.where).toEqual({ slug: 'course', ...publicCourseWhere });
    expect(access.select.enrollments.where).toEqual({
      user_id: 'student',
      status: { in: ['ACTIVE', 'COMPLETED'] },
    });
    await repository.getLessonPlayback('course', 'lesson', 'student');
    const query = findFirst.mock.calls[1][0];
    expect(query.where).toEqual({
      id: 'lesson',
      is_active: true,
      courses: { slug: 'course', ...publicCourseWhere },
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

it('excludes retired demos consistently from category counts, catalog search, shelves, programs and direct video access', async () => {
  const calls: any[] = [];
  const capture = async (q: any) => {
    calls.push(q);
    return [];
  };
  const db: any = {
    courses: {
      findMany: capture,
      count: async (q: any) => {
        calls.push(q);
        return 0;
      },
      findFirst: async (q: any) => {
        calls.push(q);
        return null;
      },
    },
    course_categories: {
      findMany: async () => [{ id: 'cat', children: [] }],
      findFirst: async () => null,
    },
    course_collections: { findMany: capture },
    learning_programs: { findMany: capture },
    course_lessons: {
      findFirst: async (q: any) => {
        calls.push(q);
        return null;
      },
    },
  };
  const repository = new CoursesRepository(db);
  await repository.getCategories();
  await repository.getCourses({ page: 1, limit: 24, search: 'real' } as any);
  await repository.getCollections();
  await repository.getLearningPrograms();
  await repository.getCourseBySlug('course');
  await repository.getCourseAccess('course', 'student');
  await repository.getLessonPlayback('course', 'lesson', 'student');
  expect(calls[0].where.NOT).toEqual(publicCourseWhere.NOT);
  expect(calls[1].where.NOT).toEqual(publicCourseWhere.NOT);
  expect(calls[1].where.OR).toHaveLength(6);
  expect(calls[3].include.items.where.courses.NOT).toEqual(
    publicCourseWhere.NOT,
  );
  expect(calls[4].include.course_links.where.courses.NOT).toEqual(
    publicCourseWhere.NOT,
  );
  for (const call of calls.slice(5, 7))
    expect(call.where.NOT).toEqual(publicCourseWhere.NOT);
  expect(calls[7].where.courses.NOT).toEqual(publicCourseWhere.NOT);
  expect(publicCourseWhere.NOT.AND).toEqual([
    { slug: { startsWith: 'demo-catalog-v1-' } },
    {
      description_en: { startsWith: '[TAMKEENOVA_DEMO_CATALOG_V1]', not: null },
    },
  ]);
});
