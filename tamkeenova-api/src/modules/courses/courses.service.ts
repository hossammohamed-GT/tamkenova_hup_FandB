import { Injectable, NotFoundException } from '@nestjs/common';
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
    return { success: true, data: course };
  }
}
