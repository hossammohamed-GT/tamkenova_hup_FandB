import { Module } from '@nestjs/common';

import { SpecializationsController } from './specializations.controller';
import { SpecializationsService } from './specializations.service';
import { SpecializationsRepository } from './specializations.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SpecializationsController],

  providers: [
    SpecializationsService,
    SpecializationsRepository,
  ],

  exports: [SpecializationsService],
})
export class SpecializationsModule {}