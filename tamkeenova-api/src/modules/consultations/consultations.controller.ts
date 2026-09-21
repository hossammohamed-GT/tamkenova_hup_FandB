import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationStatusDto } from './dto/update-consultation-status.dto';
import { CreateConsultationReviewDto } from './dto/create-consultation-review.dto';
import { consultation_status } from '@prisma/client';

@Controller('consultations')
export class ConsultationsController {

  // Initialize instance
  constructor(private readonly consultationsService: ConsultationsService) {}








  // Handle create consultation
  @UseGuards(JwtAuthGuard)
  @Post()
  async createConsultation(
    @CurrentUser() user: any,
    @Body() dto: CreateConsultationDto,
  ) {
    return this.consultationsService.createConsultation(user.sub, dto);
  }






  // Handle get my consultations
  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyConsultations(
    @CurrentUser() user: any,
    @Query('status') status?: consultation_status,
  ) {
    return this.consultationsService.getMyConsultations(user.sub, status);
  }






  // Handle get consultation details
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getConsultationDetails(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.consultationsService.getConsultationDetails(
      user.sub,
      id,
      user.role,
    );
  }






  // Handle cancel consultation
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancelConsultation(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.consultationsService.cancelConsultation(user.sub, id);
  }






  // Handle create review
  @UseGuards(JwtAuthGuard)
  @Post(':id/review')
  async createReview(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateConsultationReviewDto,
  ) {
    return this.consultationsService.createReview(user.sub, id, dto);
  }








  // Handle get trainer consultations
  @UseGuards(JwtAuthGuard)
  @Get('trainer/all')
  async getTrainerConsultations(
    @CurrentUser() user: any,
    @Query('status') status?: consultation_status,
  ) {
    return this.consultationsService.getTrainerConsultations(user.sub, status);
  }






  // Handle update status
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationStatusDto,
  ) {
    return this.consultationsService.updateConsultationStatus(
      user.sub,
      id,
      dto,
    );
  }






  // Handle get trainer reviews
  @UseGuards(JwtAuthGuard)
  @Get('trainer/reviews')
  async getTrainerReviews(@CurrentUser() user: any) {
    return this.consultationsService.getTrainerReviews(user.sub);
  }
}
