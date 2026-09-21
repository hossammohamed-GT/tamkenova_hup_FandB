import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';


export class ReviewSubmissionDto {
  @IsEnum(['APPROVE', 'REJECT'])
  action: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
