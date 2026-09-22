import { certificateLogos } from './certificate-logos';
import { BadRequestException } from '@nestjs/common';

export const CERTIFICATE_TEMPLATE_VERSION = '2026.3';
export interface CertificateInput {
  certificate_language?: string | null;
  partner_logos?: unknown;
  certificate_type?: string | null;
  recipient_name?: string | null;
  program_name?: string | null;
  training_hours?: number | null;
  issued_at?: string | Date | null;
}
export function legacyCertificateData(input: CertificateInput) {
  if (
    input.certificate_language !== 'ar' &&
    input.certificate_language !== 'en'
  )
    throw new BadRequestException(
      'Select Arabic or English certificate language',
    );
  const partner_logos = certificateLogos(input.partner_logos);
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
    certificate_language: input.certificate_language,
    partner_logos,
    certificate_type: input.certificate_type as 'TRAINING' | 'VOLUNTEER',
    template_version: '2026.2',
    recipient_name: recipient,
    program_name: program,
    training_hours: input.training_hours!,
    issued_at: new Date(`${date}T00:00:00.000Z`),
    // Compatibility metadata for lists/notifications, not artwork content.
    title:
      program ??
      (input.certificate_language === 'ar'
        ? 'تقدير العمل التطوعي'
        : 'Volunteer Recognition'),
    title_ar: null,
    title_en: null,
    description: null,
    description_ar: null,
    description_en: null,
    pdf_url: null,
    qr_code_url: null,
    partner_ids: partner_logos.flatMap((logo) =>
      logo.source_id ? [logo.source_id] : [],
    ),
  };
}

export interface BilingualCertificateInput extends CertificateInput {
  recipient_name_ar?: string | null;
  recipient_name_en?: string | null;
  program_name_ar?: string | null;
  program_name_en?: string | null;
  signature_name?: string | null;
  description?: string | null;
  template_version?: string | null;
}
export const BILINGUAL_SCHEMA = 'tamkeenova.certificate/2026.3';
/** Only read our own versioned envelope, never interpret historical free text. */
export function bilingualMetadata(record: {
  description?: string | null;
  template_version?: string | null;
}) {
  if (record.template_version !== CERTIFICATE_TEMPLATE_VERSION) return null;
  try {
    const data = JSON.parse(record.description ?? '');
    return data?.schema === BILINGUAL_SCHEMA ? data : null;
  } catch {
    return null;
  }
}
/** Both language editions are ONE record: shared ownership, QR and revocation. No schema migration. */
export function certificateData(input: BilingualCertificateInput) {
  const saved = bilingualMetadata(input);
  const merged = { ...saved, ...input };
  const text = (value: unknown, max: number) => {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.length > max ||
      /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)
    )
      throw new BadRequestException(
        'Enter both language versions and one signature name',
      );
    return value.trim().replace(/\s+/g, ' ');
  };
  const recipient_name_ar = text(merged.recipient_name_ar, 120);
  const recipient_name_en = text(merged.recipient_name_en, 120);
  const signature_name = text(merged.signature_name, 80);
  const training = input.certificate_type === 'TRAINING';
  if (!training && (merged.program_name_ar || merged.program_name_en))
    throw new BadRequestException(
      'Experience certificates do not have a program name',
    );
  const program_name_ar = training ? text(merged.program_name_ar, 180) : null;
  const program_name_en = training ? text(merged.program_name_en, 180) : null;
  const data = legacyCertificateData({
    ...input,
    certificate_language: 'ar',
    recipient_name: recipient_name_ar,
    program_name: program_name_ar,
  });
  return {
    ...data,
    template_version: CERTIFICATE_TEMPLATE_VERSION,
    title: program_name_ar ?? 'شهادة خبرة',
    title_ar: program_name_ar ?? 'شهادة خبرة',
    title_en: program_name_en ?? 'Certificate of Experience',
    description: JSON.stringify({
      schema: BILINGUAL_SCHEMA,
      recipient_name_ar,
      recipient_name_en,
      program_name_ar,
      program_name_en,
      signature_name,
    }),
  };
}
