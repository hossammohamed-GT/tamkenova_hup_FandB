import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Empty string (e.g. untouched optional inputs sent as "") must be treated as
// "not provided" — @IsOptional() only skips null/undefined, so "" would fail @IsUrl().
const trimOptionalUrl = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export class PartnerDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_ar: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_en: string;

  @Transform(trim)
  @IsUrl()
  logo_url: string;

  @Transform(trimOptionalUrl)
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
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_ar?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_en?: string;

  @Transform(trim)
  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @Transform(trimOptionalUrl)
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
