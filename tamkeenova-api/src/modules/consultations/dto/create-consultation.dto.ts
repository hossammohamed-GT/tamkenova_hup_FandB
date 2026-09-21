import {
  IsUUID,
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsDecimal,
} from 'class-validator';

export class CreateConsultationDto {
  @IsUUID()
  trainer_id: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsDateString()
  preferred_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  preferred_time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contact_phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  preferred_contact_method?: string;

  @IsOptional()
  @IsString()
  student_notes?: string;
}
