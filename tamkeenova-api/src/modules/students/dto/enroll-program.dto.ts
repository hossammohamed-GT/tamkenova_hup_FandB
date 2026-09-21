import { IsUUID, IsOptional, IsString } from 'class-validator';

export class EnrollProgramDto {
  @IsUUID()
  program_id: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
