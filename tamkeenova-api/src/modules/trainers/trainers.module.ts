import { Module } from '@nestjs/common';

import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';
import { TrainersRepository } from './trainers.repository';

import { AuthModule } from '../auth/auth.module';

import { StorageModule } from '../storage/storage.module';
@Module({
  imports: [AuthModule, StorageModule],

  controllers: [TrainersController],

  providers: [TrainersService, TrainersRepository],
})
export class TrainersModule {}
