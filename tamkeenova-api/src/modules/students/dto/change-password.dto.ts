import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { PASSWORD_PATTERN } from '../../../common/security/password.util';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  current_password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must be 8-128 characters and include upper, lower, and a number',
  })
  new_password: string;
}
