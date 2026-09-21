import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { AssigneeDto } from './assignee.dto';


export class CreateTaskDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsIn([60, 70, 80, 90])
  required_score?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimated_hours?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneeDto)
  assignees: AssigneeDto[];
}
