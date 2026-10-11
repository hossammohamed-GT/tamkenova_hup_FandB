import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CourseCatalogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  category?: string;

  @IsOptional()
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'])
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  language?: string;

  @IsOptional()
  @IsIn(['VIDEO', 'PODCOURSE'])
  content_type?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  is_free?: string;

  @IsOptional()
  @IsIn(['newest', 'popular', 'rating', 'duration'])
  sort?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit = 24;
}
