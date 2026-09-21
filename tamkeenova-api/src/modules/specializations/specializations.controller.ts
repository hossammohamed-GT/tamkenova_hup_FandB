import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { SpecializationsService } from './specializations.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { RequestSpecializationDto } from './dto/request-specialization.dto';


@Controller('specializations')
export class SpecializationsController {

  // Initialize instance
  constructor(
    private readonly specializationsService: SpecializationsService,
  ) {}



  // Handle get all
  @Get()
  getAll() {
    return this.specializationsService.getAll();
  }



  // Handle get by id
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.specializationsService.getById(id);
  }



  // Handle request specialization
  @Post('request')
  @UseGuards(JwtAuthGuard)
  requestSpecialization(
    @CurrentUser() user: any,
    @Body() dto: RequestSpecializationDto,
  ) {
    return this.specializationsService.requestSpecialization(
      user.sub,
      dto,
    );
  }
}
