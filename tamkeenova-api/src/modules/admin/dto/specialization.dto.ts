import { IsString, MaxLength } from 'class-validator';


export class SpecializationDto {
  @IsString()
  @MaxLength(255)
  name_ar: string;

  @IsString()
  @MaxLength(255)
  name_en: string;
}
