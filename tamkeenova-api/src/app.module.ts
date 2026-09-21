import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { TestModule } from './modules/test/test.module';

import { AppController } from './app.controller';

import { TrainersModule } from './modules/trainers/trainers.module';

import { SpecializationsModule } from './modules/specializations/specializations.module';

import { StudentsModule } from './modules/students/students.module';

import { NotificationsModule } from './modules/notifications/notifications.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { CorporateRequestsModule } from './modules/corporate-requests/corporate-requests.module';

import { VerificationModule } from './modules/verification/verification.module';
import { AdminModule } from './modules/admin/admin.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuthModule,

    MailModule,

    TrainersModule,
    SpecializationsModule,

    StudentsModule,
    NotificationsModule,
    ConsultationsModule,
    CorporateRequestsModule,
    VerificationModule,

    AdminModule,
    TasksModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
