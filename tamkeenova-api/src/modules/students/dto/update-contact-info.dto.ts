import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateContactInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedin_url?: string;
}
