import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';


export class AssigneeDto {
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  task_order?: number;
}
