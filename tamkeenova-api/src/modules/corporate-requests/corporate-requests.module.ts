import { Module } from '@nestjs/common';
import { CorporateRequestsController } from './corporate-requests.controller';
import { CorporateRequestsService } from './corporate-requests.service';
import { CorporateRequestsRepository } from './corporate-requests.repository';
import { StorageModule } from '../storage/storage.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [StorageModule, MailModule],
  controllers: [CorporateRequestsController],
  providers: [CorporateRequestsService, CorporateRequestsRepository],
  exports: [CorporateRequestsService, CorporateRequestsRepository],
})
export class CorporateRequestsModule {}
