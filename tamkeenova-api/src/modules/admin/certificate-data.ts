import { BadRequestException } from '@nestjs/common';

export const CERTIFICATE_TEMPLATE_VERSION = '2026.1';
export interface CertificateInput {
  certificate_type?: string | null;
  recipient_name?: string | null;
  program_name?: string | null;
  training_hours?: number | null;
  issued_at?: string | Date | null;
}
export function certificateData(input: CertificateInput) {
  const text = (value: unknown, max: number) => {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.length > max ||
      /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)
    ) {
      throw new BadRequestException('Invalid certificate text');
    }
    return value.trim().replace(/\s+/g, ' ');
  };
  if (
    input.certificate_type !== 'TRAINING' &&
    input.certificate_type !== 'VOLUNTEER'
  ) {
    throw new BadRequestException('Select a training or volunteer template');
  }
  const recipient = text(input.recipient_name, 120);
  const program =
    input.certificate_type === 'TRAINING'
      ? text(input.program_name, 180)
      : null;
  if (input.certificate_type === 'VOLUNTEER' && input.program_name)
    throw new BadRequestException(
      'Volunteer certificates do not have a program name',
    );
  if (
    !Number.isInteger(input.training_hours) ||
    input.training_hours! < 1 ||
    input.training_hours! > 100000
  ) {
    throw new BadRequestException(
      'Certificate hours must be an integer between 1 and 100000',
    );
  }
  const date =
    input.issued_at instanceof Date
      ? input.issued_at.toISOString().slice(0, 10)
      : input.issued_at;
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date < '1900-01-01' ||
    date > '2100-12-31'
  ) {
    throw new BadRequestException('Invalid certificate date');
  }
  return {
    certificate_type: input.certificate_type as 'TRAINING' | 'VOLUNTEER',
    template_version: CERTIFICATE_TEMPLATE_VERSION,
    recipient_name: recipient,
    program_name: program,
    training_hours: input.training_hours!,
    issued_at: new Date(`${date}T00:00:00.000Z`),
    // Compatibility metadata for lists/notifications, not artwork content.
    title: program ?? 'Volunteer Recognition',
    title_ar: null,
    title_en: null,
    description: null,
    description_ar: null,
    description_en: null,
    pdf_url: null,
    qr_code_url: null,
    partner_ids: [],
  };
}
