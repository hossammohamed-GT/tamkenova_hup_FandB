import { IsString, IsUrl, MaxLength } from 'class-validator';


export class TrainerDocumentDto {
  @IsString()
  @MaxLength(255)
  file_name: string;

  @IsUrl()
  file_url: string;

  @IsString()
  @MaxLength(50)
  file_type: string;
}
