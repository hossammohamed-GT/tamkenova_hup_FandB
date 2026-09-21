import {
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  ArrayMaxSize,
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
  @IsString()
  title_ar?: string;

  @IsOptional()
  @IsString()
  title_en?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsString()
  description_en?: string;

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUUID('4', { each: true })
  partner_ids?: string[];
}
