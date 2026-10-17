import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Get(':slug/access')
  @Header('Cache-Control', 'private, no-store')
  @Header('Vary', 'Authorization')
  getCourseAccess(
    @Param('slug') slug: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.coursesService.getCourseAccess(slug, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':slug/lessons/:lessonId/playback')
  @Header('Cache-Control', 'private, no-store')
  @Header('Vary', 'Authorization')
  getLessonPlayback(
    @Param('slug') slug: string,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.coursesService.getLessonPlayback(slug, lessonId, user.sub);
  }

  @Get(':slug')
  getCourseBySlug(@Param('slug') slug: string) {
    return this.coursesService.getCourseBySlug(slug);
  }
}
