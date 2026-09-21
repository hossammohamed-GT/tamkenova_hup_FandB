import {
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

// No editable headings, descriptions, logos, signatures or arbitrary QR URLs.
export class IssueCertificateDto {
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
