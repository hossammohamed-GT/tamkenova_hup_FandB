import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class PartnerDto {
  @IsString()
  @MaxLength(255)
  name_ar: string;

  @IsString()
  @MaxLength(255)
  name_en: string;

  @IsUrl()
  logo_url: string;

  @IsOptional()
  @IsUrl()
  website_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}

export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string;

  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @IsOptional()
  @IsUrl()
  website_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}
