import { IsEnum } from 'class-validator';


export class ChangeRoleDto {
  @IsEnum([
    'STUDENT',
    'TRAINER',
    'CLIENT',
    'EMPLOYEE',
    'ADMIN',
    'SUPER_ADMIN',
    'VOLUNTEER',
  ])
  role: string;
}
