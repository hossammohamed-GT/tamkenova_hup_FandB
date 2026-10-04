import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IssueCertificateDto } from './issue-certificate.dto';

export class UpdateCertificateDto extends PartialType(
  OmitType(IssueCertificateDto, ['user_id'] as const),
) {}
