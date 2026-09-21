import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class TrainerDocumentDto {
  @IsString()
  file_name: string;

  @IsUrl()
  file_url: string;

  @IsString()
  file_type: string;
}

export class UpdateTrainerProfileDto {
  @IsOptional()
  @IsString()
  bio_ar?: string;

  @IsOptional()
  @IsString()
  bio_en?: string;

  @IsOptional()
  @IsString()
  description_ar?: string;

  @IsOptional()
  @IsString()
  description_en?: string;

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
  consultation_price_from?: number;

  @IsOptional()
  consultation_price_to?: number;

  @IsOptional()
  @IsInt()
  consultation_duration?: number;

  @IsOptional()
  @IsArray()
  certificate_urls?: string[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TrainerDocumentDto)
  documents?: TrainerDocumentDto[];
}
