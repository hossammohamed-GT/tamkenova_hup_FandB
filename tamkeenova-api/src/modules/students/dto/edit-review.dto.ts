import { IsOptional, IsString, IsInt, Min, Max, MaxLength } from 'class-validator';

export class EditReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
