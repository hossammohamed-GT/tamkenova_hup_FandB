import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class AvailabilityDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  phone?: string;
}
