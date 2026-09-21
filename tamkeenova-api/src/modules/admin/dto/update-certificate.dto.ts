import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';


export class UpdateCertificateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  training_hours?: number;

  @IsOptional()
  @IsBoolean()
  is_valid?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUUID('4', { each: true })
  partner_ids?: string[];
}
