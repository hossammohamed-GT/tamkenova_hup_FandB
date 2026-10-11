import { Controller, Get, Param, Query } from '@nestjs/common';
import { CourseCatalogQueryDto } from './dto/course-catalog-query.dto';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('categories')
  getCategories() {
    return this.coursesService.getCategories();
  }

  @Get('collections')
  getCollections() {
    return this.coursesService.getCollections();
  }

  @Get('learning-programs')
  getLearningPrograms() {
    return this.coursesService.getLearningPrograms();
  }

  @Get()
  getCourses(@Query() query: CourseCatalogQueryDto) {
    return this.coursesService.getCourses(query);
  }

  @Get(':slug')
  getCourseBySlug(@Param('slug') slug: string) {
    return this.coursesService.getCourseBySlug(slug);
  }
}
