import { ValidationPipe } from '@nestjs/common';
import { legacyCertificateData as certificateData } from './certificate-data';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

const values = {
  certificate_type: 'TRAINING' as const,
  certificate_language: 'en' as const,
  recipient_name: '  ليلى أحمد  ',
  program_name: 'Leadership Development',
  training_hours: 32,
  issued_at: '2026-09-21',
};
const issue = { ...values, recipient_name_ar: 'ليلى أحمد', recipient_name_en: 'Layla Ahmed', program_name_ar: 'القيادة', program_name_en: 'Leadership', signature_name: 'Ahmed Hassan', user_id: '550e8400-e29b-41d4-a716-446655440000' };
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
describe('certificate data contract', () => {
  it('snapshots permitted values and resets obsolete static customizations', () => {
    expect(certificateData(values)).toMatchObject({
      template_version: '2026.2',
      recipient_name: 'ليلى أحمد',
      title: 'Leadership Development',
      issued_at: new Date('2026-09-21T00:00:00Z'),
      pdf_url: null,
      description: null,
      partner_ids: [],
    });
  });
  it('stores volunteer recognition without a program', () => {
    expect(
      certificateData({
        ...values,
        certificate_type: 'VOLUNTEER',
        program_name: null,
      }),
    ).toMatchObject({ title: 'Volunteer Recognition', program_name: null });
  });
  it.each([
    { certificate_type: 'OTHER' },
    { certificate_type: null },
    { recipient_name: '  ' },
    { recipient_name: 'a'.repeat(121) },
    { recipient_name: 'Name\u202eabc' },
    { program_name: '' },
    { program_name: 'a'.repeat(181) },
    { training_hours: 0 },
    { training_hours: 1.5 },
    { training_hours: 100001 },
    { training_hours: null },
    { issued_at: '2026-02-30' },
    { issued_at: 'no' },
    { issued_at: '2101-01-01' },
    { certificate_type: 'VOLUNTEER', program_name: 'Disallowed' },
  ])('rejects invalid values %j', (patch) => {
    expect(() => certificateData({ ...values, ...patch })).toThrow();
  });
  it('validates issue and partial update DTOs', async () => {
    await expect(
      pipe.transform(issue, { type: 'body', metatype: IssueCertificateDto }),
    ).resolves.toBeInstanceOf(IssueCertificateDto);
    await expect(
      pipe.transform(
        { training_hours: 12 },
        { type: 'body', metatype: UpdateCertificateDto },
      ),
    ).resolves.toBeInstanceOf(UpdateCertificateDto);
  });
  it.each([
    'title',
    'description',
    'partner_ids',
    'pdf_url',
    'qr_code_url',
    'verification_code',
    'template_version',
    'is_valid',
  ])('rejects editing fixed/system field %s', async (field) => {
    await expect(
      pipe.transform(
        { ...issue, [field]: 'tampered' },
        { type: 'body', metatype: IssueCertificateDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { [field]: 'tampered' },
        { type: 'body', metatype: UpdateCertificateDto },
      ),
    ).rejects.toThrow();
  });
  it('does not allow recipient account reassignment through updates', async () => {
    await expect(
      pipe.transform(
        { user_id: issue.user_id },
        { type: 'body', metatype: UpdateCertificateDto },
      ),
    ).rejects.toThrow();
  });
  it('validates a partial update against the complete saved record', () => {
    const record = certificateData(values);
    expect(
      certificateData({ ...record, training_hours: 50 }).training_hours,
    ).toBe(50);
    expect(() =>
      certificateData({ ...record, recipient_name: null }),
    ).toThrow();
    expect(() =>
      certificateData({ ...record, certificate_type: 'VOLUNTEER' }),
    ).toThrow();
    expect(
      certificateData({
        ...record,
        certificate_type: 'VOLUNTEER',
        program_name: null,
      }).program_name,
    ).toBeNull();
  });
});
