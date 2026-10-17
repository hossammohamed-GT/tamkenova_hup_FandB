import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { TasksService } from './tasks.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssigneeDto } from './dto/assignee.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { CreateCommentDto } from './dto/create-comment.dto';


@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {


  constructor(private readonly tasksService: TasksService) {}






  @Get('my')
  @Roles('EMPLOYEE', 'VOLUNTEER')
  getMyTasks(@CurrentUser() user: any) {
    return this.tasksService.getMyTasks(user.sub);
  }



  @Get('dashboard')
  @Roles('EMPLOYEE', 'VOLUNTEER')
  getDashboard(@CurrentUser() user: any) {
    return this.tasksService.getDashboard(user.sub, user.role);
  }





  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  createTask(@CurrentUser() admin: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(admin.sub, dto);
  }



  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  listTasks(@Query('status') status?: string) {
    return this.tasksService.listTasks(status);
  }





  @Patch('assignees/:id/review')
  @Roles('ADMIN', 'SUPER_ADMIN')
  reviewSubmission(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.tasksService.reviewSubmission(admin.sub, id, dto);
  }





  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, dto);
  }



  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteTask(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }



  @Post(':id/assignees')
  @Roles('ADMIN', 'SUPER_ADMIN')
  addAssignee(@Param('id') id: string, @Body() dto: AssigneeDto) {
    return this.tasksService.addAssignee(id, dto);
  }



  @Delete(':id/assignees/:userId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  removeAssignee(@Param('id') id: string, @Param('userId') userId: string) {
    return this.tasksService.removeAssignee(id, userId);
  }



  @Get(':id/submissions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getTaskSubmissions(@Param('id') id: string) {
    return this.tasksService.getTaskSubmissions(id);
  }





  @Patch(':id/start')
  @Roles('EMPLOYEE', 'VOLUNTEER')
  startTask(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.startTask(user.sub, id);
  }



  @Post(':id/submit')
  @Roles('EMPLOYEE', 'VOLUNTEER')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  submitTask(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SubmitTaskDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.tasksService.submitTask(user.sub, id, dto, files);
  }





  @Get(':id/comments')
  @Roles('ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  getComments(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.tasksService.getComments(user.sub, user.role, id);
  }



  @Post(':id/comments')
  @Roles('ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  addComment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.tasksService.addComment(user.sub, user.role, id, dto);
  }



  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'VOLUNTEER')
  getTaskDetails(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.tasksService.getTaskDetails(user.sub, user.role, id);
  }
}
