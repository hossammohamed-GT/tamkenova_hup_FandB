import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';


export class UpdateTrainerAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio_ar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio_en?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsString()
  description_en?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  years_of_experience?: number;

  @IsOptional()
  @IsString()
  cover_letter?: string;

  @IsOptional()
  @IsUrl()
  linkedin_url?: string;

  @IsOptional()
  @IsUrl()
  facebook_url?: string;

  @IsOptional()
  @IsUrl()
  website_url?: string;

  @IsOptional()
  @IsUrl()
  portfolio_url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  consultation_price_from?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  consultation_price_to?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  consultation_duration?: number;
}
