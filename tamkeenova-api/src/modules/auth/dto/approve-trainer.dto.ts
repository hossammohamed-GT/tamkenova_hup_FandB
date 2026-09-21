import { IsUUID } from 'class-validator';

export class ApproveTrainerDto {
  @IsUUID()
  trainerId: string;
}