import { Module } from '@nestjs/common';

import { SpecializationsController } from './specializations.controller';
import { SpecializationsService } from './specializations.service';
import { SpecializationsRepository } from './specializations.repository';

@Module({
  controllers: [SpecializationsController],

  providers: [
    SpecializationsService,
    SpecializationsRepository,
  ],

  exports: [SpecializationsService],
})
export class SpecializationsModule {}