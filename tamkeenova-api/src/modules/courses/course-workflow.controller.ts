import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CourseWorkflowService } from './course-workflow.service';
import {
  CheckoutSettingsDto,
  CompletionDecisionDto,
  CompletionRequestDto,
  CourseDecisionDto,
  CourseDraftDto,
  PaymentDecisionDto,
  TransferReportDto,
} from './dto/course-workflow.dto';
type User = { sub: string };
@Controller('course-workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseWorkflowController {
  constructor(private readonly workflow: CourseWorkflowService) {}
  @Get('trainer/courses')
  @Header('Cache-Control', 'private, no-store')
  @Roles('TRAINER')
  trainerCourses(@CurrentUser() u: User) {
    return this.workflow.trainerCourses(u.sub);
  }
  @Get('trainer/courses/:id')
  @Header('Cache-Control', 'private, no-store')
  @Roles('TRAINER')
  trainerCourse(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflow.courseForReview(id, u.sub);
  }
  @Post('trainer/courses') @Roles('TRAINER') createCourse(
    @CurrentUser() u: User,
    @Body() dto: CourseDraftDto,
  ) {
    return this.workflow.saveCourse(u.sub, dto);
  }
  @Put('trainer/courses/:id') @Roles('TRAINER') updateCourse(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CourseDraftDto,
  ) {
    return this.workflow.saveCourse(u.sub, dto, id);
  }
  @Post('trainer/courses/:id/submit') @Roles('TRAINER') submit(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflow.submitCourse(u.sub, id);
  }
  @Get('trainer/completions')
  @Header('Cache-Control', 'private, no-store')
  @Roles('TRAINER')
  completions(@CurrentUser() u: User) {
    return this.workflow.trainerCompletions(u.sub);
  }
  @Post('trainer/completions/:id/review') @Roles('TRAINER') complete(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletionDecisionDto,
  ) {
    return this.workflow.reviewCompletion(u.sub, id, dto);
  }
  @Get('admin/courses')
  @Header('Cache-Control', 'private, no-store')
  @Roles('ADMIN', 'SUPER_ADMIN')
  adminCourses(@Query('status') status?: string) {
    return this.workflow.adminCourses(status);
  }
  @Get('admin/courses/:id')
  @Header('Cache-Control', 'private, no-store')
  @Roles('ADMIN', 'SUPER_ADMIN')
  adminCourse(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.courseForReview(id);
  }
  @Post('admin/courses/:id/review') @Roles('ADMIN', 'SUPER_ADMIN') reviewCourse(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CourseDecisionDto,
  ) {
    return this.workflow.reviewCourse(u.sub, id, dto);
  }
  @Get('admin/payments')
  @Header('Cache-Control', 'private, no-store')
  @Roles('ADMIN', 'SUPER_ADMIN')
  payments(@Query('status') status?: string) {
    return this.workflow.adminPayments(status);
  }
  @Post('admin/payments/:id/review')
  @Roles('ADMIN', 'SUPER_ADMIN')
  reviewPayment(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PaymentDecisionDto,
  ) {
    return this.workflow.reviewPayment(u.sub, id, dto);
  }
  @Get('admin/settings')
  @Header('Cache-Control', 'private, no-store')
  @Roles('ADMIN', 'SUPER_ADMIN')
  settings() {
    return this.workflow.settings();
  }
  @Put('admin/settings') @Roles('ADMIN', 'SUPER_ADMIN') saveSettings(
    @CurrentUser() u: User,
    @Body() dto: CheckoutSettingsDto,
  ) {
    return this.workflow.saveSettings(u.sub, dto);
  }
  @Get('checkout/:id')
  @Roles('STUDENT', 'CLIENT', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  @Header('Cache-Control', 'private, no-store')
  checkout(@CurrentUser() u: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.checkout(u.sub, id);
  }
  @Post('checkout/:id/report')
  @Roles('STUDENT', 'CLIENT', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  report(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferReportDto,
  ) {
    return this.workflow.reportTransfer(u.sub, id, dto);
  }
  @Post('enroll/:id/free')
  @Roles('STUDENT', 'CLIENT', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  enrollFree(@CurrentUser() u: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.enrollFree(u.sub, id);
  }
  @Get('library/payments')
  @Roles('STUDENT', 'CLIENT', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  @Header('Cache-Control', 'private, no-store')
  myPayments(@CurrentUser() u: User) {
    return this.workflow.myPayments(u.sub);
  }
  @Get('library')
  @Roles('STUDENT', 'CLIENT', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  @Header('Cache-Control', 'private, no-store')
  library(@CurrentUser() u: User) {
    return this.workflow.library(u.sub);
  }
  @Get('learning/:id')
  @Roles('STUDENT', 'CLIENT', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  @Header('Cache-Control', 'private, no-store')
  learning(@CurrentUser() u: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.learning(u.sub, id);
  }
  @Post('learning/:id/lessons/:lessonId/done')
  @Roles('STUDENT', 'CLIENT', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  mark(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lesson: string,
  ) {
    return this.workflow.markLesson(u.sub, id, lesson);
  }
  @Post('learning/:id/completion')
  @Roles('STUDENT', 'CLIENT', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  requestCompletion(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletionRequestDto,
  ) {
    return this.workflow.requestCompletion(u.sub, id, dto);
  }
}
