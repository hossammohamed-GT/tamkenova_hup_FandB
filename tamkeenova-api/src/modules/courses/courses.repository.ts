import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseCatalogQueryDto } from './dto/course-catalog-query.dto';

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private courseCardInclude() {
    return {
      category_links: {
        orderBy: { display_order: 'asc' as const },
        include: {
          course_categories: {
            select: {
              id: true,
              slug: true,
              name_ar: true,
              name_en: true,
              parent_id: true,
            },
          },
        },
      },
      instructors: {
        where: { trainers: { is: { trainer_status: 'APPROVED' as const } } },
        orderBy: { display_order: 'asc' as const },
        include: {
          trainers: {
            select: {
              id: true,
              slug: true,
              bio_ar: true,
              bio_en: true,
              users: {
                select: {
                  full_name: true,
                  profile_image: true,
                },
              },
              specializations: {
                select: {
                  name_ar: true,
                  name_en: true,
                },
              },
            },
          },
        },
      },
    };
  }

  async getCategories() {
    const categories = await this.prisma.course_categories.findMany({
      where: { is_active: true, parent_id: null },
      orderBy: { display_order: 'asc' },
      include: {
        children: {
          where: { is_active: true },
          orderBy: { display_order: 'asc' },
          select: {
            id: true,
            slug: true,
            name_ar: true,
            name_en: true,
            parent_id: true,
          },
        },
      },
    });

    const courseCounts = await Promise.all(
      categories.map((category) =>
        this.prisma.courses.count({
          where: {
            status: 'PUBLISHED',
            category_links: {
              some: {
                category_id: {
                  in: [category.id, ...category.children.map((child) => child.id)],
                },
              },
            },
          },
        }),
      ),
    );

    return categories.map((category, index) => ({
      ...category,
      courses_count: courseCounts[index],
    }));
  }

  async getCourses(query: CourseCatalogQueryDto) {
    const where: any = { status: 'PUBLISHED' };
    const search = query.search?.trim();

    if (search) {
      where.OR = [
        { title_en: { contains: search, mode: 'insensitive' } },
        { title_ar: { contains: search } },
        { short_description_en: { contains: search, mode: 'insensitive' } },
        { short_description_ar: { contains: search } },
        { description_en: { contains: search, mode: 'insensitive' } },
        { description_ar: { contains: search } },
      ];
    }

    if (query.category) {
      where.category_links = {
        some: {
          course_categories: { slug: query.category, is_active: true },
        },
      };
    }
    if (query.level) where.level = query.level;
    if (query.language) where.language = query.language;
    if (query.content_type) where.content_type = query.content_type;
    if (query.is_free !== undefined) where.is_free = query.is_free === 'true';

    const orderBy = this.getOrderBy(query.sort);
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.prisma.courses.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        include: this.courseCardInclude(),
      }),
      this.prisma.courses.count({ where }),
    ]);

    return { data, total };
  }

  async getCollections() {
    const collections = await this.prisma.course_collections.findMany({
      where: { is_active: true },
      orderBy: [{ display_order: 'asc' }, { title_en: 'asc' }],
      include: {
        items: {
          where: { courses: { status: 'PUBLISHED' } },
          orderBy: { position: 'asc' },
          include: {
            courses: { include: this.courseCardInclude() },
          },
        },
      },
    });

    return collections.map(({ items, ...collection }) => ({
      ...collection,
      courses: items.map((item) => item.courses),
    }));
  }

  async getLearningPrograms() {
    const programs = await this.prisma.learning_programs.findMany({
      where: {
        is_active: true,
        OR: [{ published_at: null }, { published_at: { lte: new Date() } }],
      },
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
      include: {
        course_categories: {
          select: {
            id: true,
            slug: true,
            name_ar: true,
            name_en: true,
          },
        },
        course_links: {
          where: { courses: { status: 'PUBLISHED' } },
          orderBy: { position: 'asc' },
          include: {
            courses: { include: this.courseCardInclude() },
          },
        },
      },
    });

    return programs.map(({ course_links, ...program }) => ({
      ...program,
      courses: course_links.map((link) => link.courses),
    }));
  }

  async getCourseBySlug(slug: string) {
    return this.prisma.courses.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        ...this.courseCardInclude(),
        lessons: {
          where: { is_active: true },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title_ar: true,
            title_en: true,
            description_ar: true,
            description_en: true,
            duration_minutes: true,
            position: true,
            is_preview: true,
          },
        },
      },
    });
  }

  private getOrderBy(sort?: string) {
    switch (sort) {
      case 'popular':
        return [
          { enrollments_count: 'desc' as const },
          { published_at: 'desc' as const },
        ];
      case 'rating':
        return [
          { average_rating: 'desc' as const },
          { ratings_count: 'desc' as const },
        ];
      case 'duration':
        return [
          { duration_minutes: 'asc' as const },
          { title_en: 'asc' as const },
        ];
      case 'newest':
      default:
        return [
          { published_at: 'desc' as const },
          { created_at: 'desc' as const },
        ];
    }
  }
}
