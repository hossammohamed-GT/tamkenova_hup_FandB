import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseCatalogQueryDto } from './dto/course-catalog-query.dto';
import { CoursesRepository } from './courses.repository';

@Injectable()
export class CoursesService {
  constructor(private readonly repository: CoursesRepository) {}

  async getCategories() {
    const data = await this.repository.getCategories();
    return { success: true, count: data.length, data };
  }

  async getCourses(query: CourseCatalogQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 24;
    const { data, total } = await this.repository.getCourses({
      ...query,
      page,
      limit,
    });

    return {
      success: true,
      count: data.length,
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getCollections() {
    const data = await this.repository.getCollections();
    return { success: true, count: data.length, data };
  }

  async getLearningPrograms() {
    const data = await this.repository.getLearningPrograms();
    return { success: true, count: data.length, data };
  }

  async getCourseBySlug(slug: string) {
    const course = await this.repository.getCourseBySlug(slug);
    if (!course) throw new NotFoundException('Course not found');
    // Never publish paid lesson URLs through the public course endpoint.
    const lessons = course.lessons.map((lesson) => ({
      ...lesson,
      media_url: course.is_free || lesson.is_preview ? lesson.media_url : null,
    }));
    return { success: true, data: { ...course, lessons } };
  }

  async getCourseAccess(slug: string, userId: string) {
    const course = await this.repository.getCourseAccess(slug, userId);
    if (!course) throw new NotFoundException('Course not found');
    return {
      success: true,
      data: { can_watch: course.is_free || course.enrollments.length > 0 },
    };
  }

  async getLessonPlayback(slug: string, lessonId: string, userId: string) {
    const lesson = await this.repository.getLessonPlayback(
      slug,
      lessonId,
      userId,
    );
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (
      !lesson.is_preview &&
      !lesson.courses.is_free &&
      !lesson.courses.enrollments.length
    ) {
      throw new ForbiddenException('Course enrollment required');
    }
    if (!lesson.media_url)
      throw new NotFoundException('Lesson video is not configured');
    return {
      success: true,
      data: { id: lesson.id, media_url: lesson.media_url },
    };
  }
}
