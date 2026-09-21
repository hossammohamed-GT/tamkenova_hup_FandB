import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
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

export class RegisterDto {
  @IsString()
  full_name: string;

  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @MinLength(6)
  password: string;

  @IsEnum(['STUDENT', 'TRAINER'])
  role: string;

  @IsOptional()
  @IsString()
  specialization_id?: string;

  @IsOptional()
  @IsString()
  specialization_name_ar?: string;

  @IsOptional()
  @IsString()
  specialization_name_en?: string;

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
