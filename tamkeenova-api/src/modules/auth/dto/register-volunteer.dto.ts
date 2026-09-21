import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';


export class RegisterVolunteerDto {
  @IsString()
  full_name: string;

  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(8)
  confirm_password: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
