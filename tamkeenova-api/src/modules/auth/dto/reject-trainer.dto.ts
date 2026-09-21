import { IsString, IsUUID, MinLength } from 'class-validator';

export class RejectTrainerDto {
  @IsUUID()
  trainerId: string;

  @IsString()
  @MinLength(5)
  reason: string;
}
