import { CourseWorkflowController } from './course-workflow.controller';
import { CourseWorkflowService } from './course-workflow.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CoursesController } from './courses.controller';
import { CoursesRepository } from './courses.repository';
import { CoursesService } from './courses.service';

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController, CourseWorkflowController],
  providers: [CoursesService, CoursesRepository, CourseWorkflowService],
  exports: [CoursesService],
})
export class CoursesModule {}
