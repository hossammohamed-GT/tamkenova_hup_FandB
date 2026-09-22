import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_PATTERN } from '../../../common/security/password.util';


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
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must be 8-128 characters and include upper, lower, and a number',
  })
  password: string;

  @IsString()
  @MinLength(8)
  confirm_password: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
