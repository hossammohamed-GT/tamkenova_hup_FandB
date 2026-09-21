import {
  IsString,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  trainer_id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsString()
  preferred_contact_method?: string;
}