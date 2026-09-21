import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsEnum([
    'PENDING',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED',
  ])
  status: string;

  @IsOptional()
  @IsString()
  trainer_notes?: string;
}