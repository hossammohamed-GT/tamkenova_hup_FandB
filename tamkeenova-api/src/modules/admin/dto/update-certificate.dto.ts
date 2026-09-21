import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';


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
}
