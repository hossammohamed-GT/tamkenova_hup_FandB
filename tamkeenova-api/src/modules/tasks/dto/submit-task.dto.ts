import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl } from 'class-validator';



// Handle normalize link
function normalizeLink(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();


  const match = trimmed.match(/\]\(\s*(https?:\/\/[^\s)]+)\s*\)/);
  if (match) {
    return match[1];
  }

  return trimmed;
}


export class SubmitTaskDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeLink(value))
  @IsUrl({ require_protocol: true })
  link_url?: string;
}
