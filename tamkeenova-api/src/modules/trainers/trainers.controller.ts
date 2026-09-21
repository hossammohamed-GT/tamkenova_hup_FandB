import {
  Put,
  Delete,
  Param,
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { TrainersService } from './trainers.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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

  // Initialize instance
  constructor(private readonly trainersService: TrainersService) {}



  // Handle get my profile
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Req() req: any) {
    return this.trainersService.getMyProfile(req.user.sub);
  }



  // Handle update my profile
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateTrainerProfileDto) {
    return this.trainersService.updateMyProfile(req.user.sub, dto);
  }



  // Handle create program
  @Post('programs')
  @UseGuards(JwtAuthGuard)
  createProgram(@CurrentUser() user: any, @Body() dto: CreateProgramDto) {
    return this.trainersService.createProgram(user.sub, dto);
  }



  // Handle get my programs
  @Get('programs')
  @UseGuards(JwtAuthGuard)
  getMyPrograms(@CurrentUser() user: any) {
    return this.trainersService.getMyPrograms(user.sub);
  }



  // Handle update program
  @Put('programs/:id')
  @UseGuards(JwtAuthGuard)
  updateProgram(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.trainersService.updateProgram(user.sub, id, dto);
  }



  // Handle delete program
  @Delete('programs/:id')
  @UseGuards(JwtAuthGuard)
  deleteProgram(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainersService.deleteProgram(user.sub, id);
  }



  // Handle get application status
  @Get('application-status')
  @UseGuards(JwtAuthGuard)
  getApplicationStatus(@CurrentUser() user: any) {
    return this.trainersService.getApplicationStatus(user.sub);
  }



  // Handle create availability
  @Post('availability')
  @UseGuards(JwtAuthGuard)
  createAvailability(
    @CurrentUser() user: any,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.trainersService.createAvailability(user.sub, dto);
  }



  // Handle get availability
  @Get('availability')
  @UseGuards(JwtAuthGuard)
  getAvailability(@CurrentUser() user: any) {
    return this.trainersService.getAvailability(user.sub);
  }



  // Handle update availability
  @Patch('availability/:id')
  @UseGuards(JwtAuthGuard)
  updateAvailability(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.trainersService.updateAvailability(user.sub, id, dto);
  }



  // Handle delete availability
  @Delete('availability/:id')
  @UseGuards(JwtAuthGuard)
  deleteAvailability(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainersService.deleteAvailability(user.sub, id);
  }



  // Handle get bookings
  @Get('bookings')
  @UseGuards(JwtAuthGuard)
  getBookings(@CurrentUser() user: any) {
    return this.trainersService.getBookings(user.sub);
  }



  // Handle get booking details
  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard)
  getBookingDetails(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainersService.getBookingDetails(user.sub, id);
  }



  // Handle update booking status
  @Patch('bookings/:id/status')
  @UseGuards(JwtAuthGuard)
  updateBookingStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.trainersService.updateBookingStatus(user.sub, id, dto);
  }



  // Handle create review
  @Post(':trainerId/reviews')
  @UseGuards(JwtAuthGuard)
  createReview(
    @CurrentUser() user: any,
    @Param('trainerId') trainerId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.trainersService.createReview(user.sub, trainerId, dto);
  }


  // Handle get all public trainers
  @Get()
  getAllPublicTrainers() {
    return this.trainersService.getAllPublicTrainers();
  }



  // Handle get trainer reviews
  @Get(':trainerId/reviews')
  getTrainerReviews(@Param('trainerId') trainerId: string) {
    return this.trainersService.getTrainerReviews(trainerId);
  }



  // Handle get dashboard
  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.trainersService.getDashboardStats(user.sub);
  }



  // Handle upload profile image
  @Post('upload-profile-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  uploadProfileImage(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.trainersService.uploadProfileImage(user.sub, file);
  }



  // Handle get all programs
  @Get('/programs/all')
  getAllPrograms() {
    return this.trainersService.getAllPrograms();
  }


  // Handle get public trainer profile
  @Get('profile/:slug')
  getPublicTrainerProfile(@Param('slug') slug: string) {
    return this.trainersService.getPublicTrainerProfile(slug);
  }
}
