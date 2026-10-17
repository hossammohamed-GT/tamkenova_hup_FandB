import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
export class LessonDraftDto {
  @IsString() @Length(2, 180) title_ar!: string;
  @IsString() @Length(2, 180) title_en!: string;
  @IsString() @MaxLength(500) media_url!: string;
  @IsInt() @Min(1) @Max(600) duration_minutes!: number;
  @IsBoolean() is_preview!: boolean;
}
export class ChapterDraftDto {
  @IsString() @Length(2, 180) title_ar!: string;
  @IsString() @Length(2, 180) title_en!: string;
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => LessonDraftDto)
  lessons!: LessonDraftDto[];
}
export class CourseDraftDto {
  @IsString() @Length(3, 180) title_ar!: string;
  @IsString() @Length(3, 180) title_en!: string;
  @IsString() @MaxLength(10000) description_ar!: string;
  @IsString() @MaxLength(10000) description_en!: string;
  @IsUUID() category_id!: string;
  @IsString() @MaxLength(500) preview_video_url!: string;
  @IsOptional() @IsString() @MaxLength(1000) cover_image_url?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000) price!: number;
  @IsIn(['ar', 'en']) language!: string;
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']) level!: string;
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ChapterDraftDto)
  sections!: ChapterDraftDto[];
}
export class CourseDecisionDto {
  @IsInt() @Min(1) revision!: number;
  @IsIn(['APPROVE', 'REJECT']) decision!: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
export class CheckoutSettingsDto {
  @IsBoolean() enabled!: boolean;
  @IsOptional() @IsString() @MaxLength(30) vodafone_cash?: string;
  @IsOptional() @IsString() @MaxLength(120) instapay?: string;
  @IsOptional() @IsString() @MaxLength(1000) instructions_ar?: string;
  @IsOptional() @IsString() @MaxLength(1000) instructions_en?: string;
}
export class TransferReportDto {
  @IsString() @Length(20, 4000) quote_token!: string;
  @IsIn(['VODAFONE_CASH', 'INSTAPAY']) method!: string;
  @IsString() @Length(3, 120) sender_account!: string;
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  reported_amount!: number;
  @IsDateString() transferred_at!: string;
  @IsOptional() @IsString() @MaxLength(120) transfer_reference?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class PaymentDecisionDto {
  @IsIn(['APPROVE', 'REJECT']) decision!: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsString() @Length(3, 120) confirmed_reference?: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  confirmed_amount?: number;
}
export class CompletionRequestDto {
  @IsString() @Length(2, 120) recipient_name_ar!: string;
  @IsString() @Length(2, 120) recipient_name_en!: string;
}
export class CompletionDecisionDto {
  @IsIn(['APPROVE', 'REJECT']) decision!: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsString() @Length(2, 80) signature_name?: string;
}
