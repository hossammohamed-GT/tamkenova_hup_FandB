import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StudentsService } from './students.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateContactInfoDto } from './dto/update-contact-info.dto';
import { SearchTrainersDto } from './dto/search-trainers.dto';
import { SearchProgramsDto } from './dto/search-programs.dto';
import { EnrollProgramDto } from './dto/enroll-program.dto';
import { EditReviewDto } from './dto/edit-review.dto';
import { enrollment_status } from '@prisma/client';

@Controller('students')
export class StudentsController {

  // Initialize instance
  constructor(private readonly studentsService: StudentsService) {}









  // Handle get public profile
  @Get('u/:username')
  async getPublicProfile(@Param('username') username: string) {
    return this.studentsService.getPublicProfile(username);
  }







  // Handle get profile
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return this.studentsService.getProfile(user.sub);
  }





  // Handle update profile
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.studentsService.updateProfile(user.sub, dto);
  }





  // Handle upload avatar
  @UseGuards(JwtAuthGuard)
  @Patch('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.studentsService.uploadAvatar(user.sub, file);
  }







  // Handle change password
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.studentsService.changePassword(user.sub, dto);
  }







  // Handle get contact info
  @UseGuards(JwtAuthGuard)
  @Get('contact-info')
  async getContactInfo(@CurrentUser() user: any) {
    return this.studentsService.getContactInfo(user.sub);
  }





  // Handle update contact info
  @UseGuards(JwtAuthGuard)
  @Patch('contact-info')
  async updateContactInfo(
    @CurrentUser() user: any,
    @Body() dto: UpdateContactInfoDto,
  ) {
    return this.studentsService.updateContactInfo(user.sub, dto);
  }







  // Handle search trainers
  @UseGuards(JwtAuthGuard)
  @Get('trainers')
  async searchTrainers(@Query() dto: SearchTrainersDto) {
    return this.studentsService.searchTrainers(dto);
  }







  // Handle search programs
  @UseGuards(JwtAuthGuard)
  @Get('programs')
  async searchPrograms(@Query() dto: SearchProgramsDto) {
    return this.studentsService.searchPrograms(dto);
  }





  // Handle get program details
  @UseGuards(JwtAuthGuard)
  @Get('programs/:id')
  async getProgramDetails(@Param('id') id: string) {
    return this.studentsService.getProgramDetails(id);
  }







  // Handle enroll in program
  @UseGuards(JwtAuthGuard)
  @Post('enrollments')
  async enrollInProgram(
    @CurrentUser() user: any,
    @Body() dto: EnrollProgramDto,
  ) {
    return this.studentsService.enrollInProgram(user.sub, dto);
  }





  // Handle get my enrollments
  @UseGuards(JwtAuthGuard)
  @Get('enrollments')
  async getMyEnrollments(
    @CurrentUser() user: any,
    @Query('status') status?: enrollment_status,
  ) {
    return this.studentsService.getMyEnrollments(user.sub, status);
  }





  // Handle get enrollment details
  @UseGuards(JwtAuthGuard)
  @Get('enrollments/:id')
  async getEnrollmentDetails(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.studentsService.getEnrollmentDetails(user.sub, id);
  }





  // Handle cancel enrollment
  @UseGuards(JwtAuthGuard)
  @Patch('enrollments/:id/cancel')
  async cancelEnrollment(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.studentsService.cancelEnrollment(user.sub, id);
  }








  // Handle get my reviews
  @UseGuards(JwtAuthGuard)
  @Get('reviews')
  async getMyReviews(@CurrentUser() user: any) {
    return this.studentsService.getMyReviews(user.sub);
  }






  // Handle edit review
  @UseGuards(JwtAuthGuard)
  @Patch('reviews/:id')
  async editReview(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: EditReviewDto,
  ) {
    return this.studentsService.editReview(user.sub, id, dto);
  }






  // Handle delete review
  @UseGuards(JwtAuthGuard)
  @Delete('reviews/:id')
  async deleteReview(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.studentsService.deleteReview(user.sub, id);
  }







  // Handle get my certificates
  @UseGuards(JwtAuthGuard)
  @Get('certificates')
  async getMyCertificates(@CurrentUser() user: any) {
    return this.studentsService.getMyCertificates(user.sub);
  }






  // Handle verify certificate
  @Get('certificates/verify/:code')
  async verifyCertificate(@Param('code') code: string) {
    return this.studentsService.verifyCertificate(code);
  }
}
