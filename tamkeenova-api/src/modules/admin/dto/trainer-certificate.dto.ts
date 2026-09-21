import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';


export class TrainerCertificateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsUrl()
  certificate_url: string;
}
