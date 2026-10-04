import { getCertificateIssuedEmailTemplate } from '../mail/templates/mail-templates';
import { ValidationPipe } from '@nestjs/common';
import {
  certificateData,
  bilingualMetadata,
  BILINGUAL_SCHEMA,
} from './certificate-data';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

const values = {
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  certificate_type: 'TRAINING' as const,
  recipient_name_ar: '  ليلى أحمد  ',
  recipient_name_en: ' Layla Ahmed ',
  program_name_ar: 'القيادة',
  program_name_en: 'Leadership',
  signature_name: ' Ahmed Hassan ',
  training_hours: 24,
  issued_at: '2026-09-22',
};
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

describe('2026.3 paired certificate contract without schema changes', () => {
  it('directs recipients to both editions and a working verification link', () => {
    const html = getCertificateIssuedEmailTemplate(
      'Layla',
      'Leadership',
      'TAM-123',
    );
    expect(html).toContain('/portal/certificates');
    expect(html).toContain('/verify?code=TAM-123');
    expect(html).toContain('بالعربية والإنجليزية');
    expect(html).not.toContain('/verify/TAM-123');
  });
  it('stores both names/programs and one signature in the existing description field', () => {
    const data = certificateData(values);
    expect(data.template_version).toBe('2026.3');
    expect(data.certificate_type).toBe('TRAINING');
    expect(data.recipient_name).toBe('ليلى أحمد');
    expect(data.title_ar).toBe('القيادة');
    expect(data.title_en).toBe('Leadership');
    expect(bilingualMetadata(data)).toEqual({
      schema: BILINGUAL_SCHEMA,
      recipient_name_ar: 'ليلى أحمد',
      recipient_name_en: 'Layla Ahmed',
      program_name_ar: 'القيادة',
      program_name_en: 'Leadership',
      signature_name: 'Ahmed Hassan',
    });
    for (const key of [
      'recipient_name_ar',
      'recipient_name_en',
      'signature_name',
    ])
      expect(data).not.toHaveProperty(key); // no nonexistent Prisma columns
  });
  it('accepts one bilingual issue request without a selected issue language', async () => {
    await expect(
      pipe.transform(values, { type: 'body', metatype: IssueCertificateDto }),
    ).resolves.toBeInstanceOf(IssueCertificateDto);
  });
  it.each([
    'recipient_name_ar',
    'recipient_name_en',
    'signature_name',
  ] as const)('requires %s in new issue requests', async (field) => {
    const payload = { ...values, [field]: undefined };
    await expect(
      pipe.transform(payload, { type: 'body', metatype: IssueCertificateDto }),
    ).rejects.toThrow();
    expect(() => certificateData(payload)).toThrow();
  });
  it.each([
    { recipient_name_ar: ' ' },
    { recipient_name_en: ' ' },
    { recipient_name_en: 'x'.repeat(121) },
    { signature_name: '' },
    { signature_name: 'x'.repeat(81) },
    { signature_name: 'Name\u202e' },
    { program_name_ar: null },
    { program_name_en: '' },
    { program_name_en: 'x'.repeat(181) },
    { issued_at: '2026-02-30' },
    { training_hours: 0 },
  ])('rejects invalid bilingual fields %j', (patch) => {
    expect(() => certificateData({ ...values, ...patch })).toThrow();
  });
  it('preserves metadata through a real ValidationPipe partial DTO', async () => {
    const saved = certificateData(values);
    const dto = await pipe.transform(
      { training_hours: 48 },
      { type: 'body', metatype: UpdateCertificateDto },
    );
    expect(certificateData({ ...saved, ...dto }).description).toBe(
      saved.description,
    );
  });
  it('preserves both versions and signature during unrelated partial edits', () => {
    const saved = certificateData(values);
    const updated = certificateData({ ...saved, training_hours: 48 });
    expect(updated.description).toBe(saved.description);
    expect(updated.training_hours).toBe(48);
  });
  it('edits one language or the shared signature without losing the other language', () => {
    const saved = certificateData(values);
    const updated = certificateData({
      ...saved,
      recipient_name_en: 'Layla Hassan',
      signature_name: 'Sara Ahmed',
    });
    expect(bilingualMetadata(updated)).toMatchObject({
      recipient_name_ar: 'ليلى أحمد',
      recipient_name_en: 'Layla Hassan',
      signature_name: 'Sara Ahmed',
    });
  });
  it('does not treat null as an omitted required value in PATCH', async () => {
    await expect(
      pipe.transform(
        { signature_name: 'New Name' },
        { type: 'body', metatype: UpdateCertificateDto },
      ),
    ).resolves.toBeInstanceOf(UpdateCertificateDto);
    expect(() =>
      certificateData({ ...certificateData(values), signature_name: null }),
    ).toThrow();
  });
  it('uses the unchanged VOLUNTEER enum for an experience certificate', () => {
    const data = certificateData({
      ...values,
      certificate_type: 'VOLUNTEER',
      program_name_ar: null,
      program_name_en: null,
    });
    expect(data.certificate_type).toBe('VOLUNTEER');
    expect(data.title_ar).toBe('شهادة خبرة');
    expect(data.title_en).toBe('Certificate of Experience');
    expect(bilingualMetadata(data).program_name_en).toBeNull();
  });
  it('requires clearing both program snapshots when switching to experience', () => {
    expect(() =>
      certificateData({
        ...certificateData(values),
        certificate_type: 'VOLUNTEER',
      }),
    ).toThrow();
    expect(
      certificateData({
        ...certificateData(values),
        certificate_type: 'VOLUNTEER',
        program_name_ar: null,
        program_name_en: null,
      }).program_name,
    ).toBeNull();
  });
  it('never invents translations or a signature for historical records', () => {
    expect(() =>
      certificateData({
        certificate_type: 'TRAINING',
        recipient_name: 'Old Name',
        program_name: 'Old program',
        certificate_language: 'en',
        training_hours: 10,
        issued_at: values.issued_at,
      }),
    ).toThrow();
    expect(
      bilingualMetadata({
        template_version: '2026.2',
        description: certificateData(values).description,
      }),
    ).toBeNull();
    expect(
      bilingualMetadata({
        template_version: '2026.3',
        description: 'not JSON',
      }),
    ).toBeNull();
  });
  it('rejects raw metadata and multiple-signature payload injection', async () => {
    for (const patch of [
      { description: '{}' },
      { signature_names: ['One', 'Two'] },
      { template_version: '2026.1' },
    ])
      await expect(
        pipe.transform(
          { ...values, ...patch },
          { type: 'body', metatype: IssueCertificateDto },
        ),
      ).rejects.toThrow();
  });
});
