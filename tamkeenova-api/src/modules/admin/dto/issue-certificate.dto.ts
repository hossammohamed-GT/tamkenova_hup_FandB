import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';


export class IssueCertificateDto {
  @IsUUID()
  user_id: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  training_hours?: number;

  @IsOptional()
  @IsEnum(['TRAINING', 'VOLUNTEER', 'OTHER'])
  certificate_type?: string;

  @IsOptional()
  @IsUUID()
  trainer_id?: string;

  @IsOptional()
  @IsUUID()
  program_id?: string;
}
