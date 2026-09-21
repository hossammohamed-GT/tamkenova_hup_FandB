import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { TestController } from './test.controller.js';

@Module({
  imports: [MailModule],
  controllers: [TestController],
})
export class TestModule {}