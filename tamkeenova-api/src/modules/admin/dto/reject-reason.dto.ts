import { IsString, MinLength } from 'class-validator';


export class RejectReasonDto {
  @IsString()
  @MinLength(5)
  reason: string;
}
