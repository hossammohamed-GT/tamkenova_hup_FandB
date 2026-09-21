import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateCorporateRequestDto {

  @IsString()
  @MaxLength(255)
  contact_name: string;

  @IsEmail()
  @MaxLength(255)
  contact_email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contact_phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contact_whatsapp?: string;


  @IsString()
  @MaxLength(255)
  company_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  employees_count?: number;


  @IsString()
  @MaxLength(100)
  service_type: string;

  @IsString()
  service_description: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  expected_budget?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  project_duration?: string;
}
