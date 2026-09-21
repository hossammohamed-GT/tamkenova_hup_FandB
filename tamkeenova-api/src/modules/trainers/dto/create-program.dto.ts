import { IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateProgramDto {
  @IsString()
  title: string;

  @IsString()
  short_description: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsUrl()
  image_url?: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  discount_price?: number;

  @IsOptional()
  @IsNumber()
  duration_hours?: number;

  @IsOptional()
  @IsString()
  level?: string;
}
