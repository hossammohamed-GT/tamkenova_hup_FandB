import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CertificatePartnerLogoDto {
  @IsString()
  @MaxLength(80)
  @Matches(/\S/u)
  name: string;

  @IsString()
  @MaxLength(90000)
  @Matches(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/)
  data_url: string;

  @IsOptional()
  @IsUUID()
  source_id?: string;
}

// Fixed headings, descriptions and institutional signature remain uneditable.
export class IssueCertificateDto {
  @IsIn(['ar', 'en'])
  certificate_language: 'ar' | 'en';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CertificatePartnerLogoDto)
  partner_logos?: CertificatePartnerLogoDto[];

  @IsUUID()
  user_id: string;

  @IsIn(['TRAINING', 'VOLUNTEER'])
  certificate_type: 'TRAINING' | 'VOLUNTEER';

  @IsString()
  @MaxLength(120)
  @Matches(/\S/u)
  recipient_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  program_name?: string | null;

  @IsInt()
  @Min(1)
  @Max(100000)
  training_hours: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  issued_at: string;
}
