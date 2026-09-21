import { IsString, IsOptional } from 'class-validator';

export class RequestSpecializationDto {
  @IsString()
  name_ar: string;

  @IsOptional()
  @IsString()
  name_en?: string;
}