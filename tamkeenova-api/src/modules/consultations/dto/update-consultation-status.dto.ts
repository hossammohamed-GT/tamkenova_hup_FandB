import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export enum ConsultationStatusAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SCHEDULE = 'SCHEDULE',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL',
}

export class UpdateConsultationStatusDto {
  @IsEnum(ConsultationStatusAction)
  action: ConsultationStatusAction;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  trainer_notes?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}
