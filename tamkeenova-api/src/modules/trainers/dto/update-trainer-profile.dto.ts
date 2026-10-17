import {
  IsArray,
  ArrayMaxSize,
  IsNumber,
  Min,
  Max,
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

  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
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
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  linkedin_url?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  facebook_url?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  website_url?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  portfolio_url?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  consultation_price_from?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  consultation_price_to?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  consultation_duration?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { each: true })
  certificate_urls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TrainerDocumentDto)
  documents?: TrainerDocumentDto[];
}
