import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class CategoryDto {
  @Transform(trimmed) @IsString() @Length(1, 180) name_ar!: string;
  @Transform(trimmed) @IsString() @Length(1, 180) name_en!: string;
  @Transform(trimmed)
  @IsString()
  @Length(1, 180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Use lowercase English letters, numbers and single hyphens / استخدم حروف إنجليزية صغيرة وأرقام وشرطة',
  })
  slug!: string;
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(4000)
  description_ar?: string | null;
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(4000)
  description_en?: string | null;
  @Transform(trimmed)
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(2048)
  @Matches(/^(?:https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/, {
    message:
      'Use an HTTPS image URL or a local /path / استخدم رابط صورة HTTPS أو مسار محلي',
  })
  image_url?: string | null;
  @ValidateIf((_, v) => v !== undefined && v !== null) @IsUUID() parent_id?:
    string | null;
  @IsInt() @Min(0) @Max(100000) display_order!: number;
  @IsBoolean() is_active!: boolean;
}
export class CategoryVisibilityDto {
  @IsBoolean() is_active!: boolean;
}
