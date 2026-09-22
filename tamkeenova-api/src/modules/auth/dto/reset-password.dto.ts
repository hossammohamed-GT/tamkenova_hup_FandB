import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_PATTERN } from '../../../common/security/password.util';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must be 8-128 characters and include upper, lower, and a number',
  })
  new_password: string;

  @IsString()
  @MinLength(8)
  confirm_password: string;
}
