import {
  Put,
  Delete,
  Param,
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Req,
  UseGuards,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { TrainersService } from './trainers.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';

import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

import { CreateReviewDto } from './dto/create-review.dto';

import { FileInterceptor } from '@nestjs/platform-express';


@Controller('trainers')
export class TrainersController {


  constructor(private readonly trainersService: TrainersService) {}




  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  @Get('me')
  async getMyProfile(@Req() req: any) {
    return this.trainersService.getMyProfile(req.user.sub);
  }




  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  @Patch('me')
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateTrainerProfileDto) {
    return this.trainersService.updateMyProfile(req.user.sub, dto);
  }




  @Post('programs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  createProgram(@CurrentUser() user: any, @Body() dto: CreateProgramDto) {
    return this.trainersService.createProgram(user.sub, dto);
  }




  @Get('programs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  getMyPrograms(@CurrentUser() user: any) {
    return this.trainersService.getMyPrograms(user.sub);
  }




  @Put('programs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  updateProgram(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.trainersService.updateProgram(user.sub, id, dto);
  }




  @Delete('programs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  deleteProgram(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainersService.deleteProgram(user.sub, id);
  }




  @Get('application-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  getApplicationStatus(@CurrentUser() user: any) {
    return this.trainersService.getApplicationStatus(user.sub);
  }




  @Post('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  createAvailability(
    @CurrentUser() user: any,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.trainersService.createAvailability(user.sub, dto);
  }




  @Get('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  getAvailability(@CurrentUser() user: any) {
    return this.trainersService.getAvailability(user.sub);
  }




  @Patch('availability/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  updateAvailability(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.trainersService.updateAvailability(user.sub, id, dto);
  }




  @Delete('availability/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  deleteAvailability(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainersService.deleteAvailability(user.sub, id);
  }




  @Get('bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  getBookings(@CurrentUser() user: any) {
    return this.trainersService.getBookings(user.sub);
  }




  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  getBookingDetails(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainersService.getBookingDetails(user.sub, id);
  }




  @Patch('bookings/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  updateBookingStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.trainersService.updateBookingStatus(user.sub, id, dto);
  }



  @Get('reviews/mine')
  @Header('Cache-Control', 'private, no-store')
  @Header('Vary', 'Authorization')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'CLIENT')
  getMyReviewStatus(@CurrentUser() user: any) {
    return this.trainersService.getMyReviewStatus(user.sub);
  }


  @Post(':trainerId/reviews')
  @UseGuards(JwtAuthGuard)
  createReview(
    @CurrentUser() user: any,
    @Param('trainerId') trainerId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.trainersService.createReview(user.sub, trainerId, dto);
  }



  @Get()
  getAllPublicTrainers() {
    return this.trainersService.getAllPublicTrainers();
  }




  @Get(':trainerId/reviews')
  getTrainerReviews(@Param('trainerId') trainerId: string) {
    return this.trainersService.getTrainerReviews(trainerId);
  }




  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.trainersService.getDashboardStats(user.sub);
  }




  @Post('upload-profile-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRAINER')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadProfileImage(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.trainersService.uploadProfileImage(user.sub, file);
  }




  @Get('/programs/all')
  getAllPrograms() {
    return this.trainersService.getAllPrograms();
  }



  @Get('profile/:slug')
  getPublicTrainerProfile(@Param('slug') slug: string) {
    return this.trainersService.getPublicTrainerProfile(slug);
  }
}
