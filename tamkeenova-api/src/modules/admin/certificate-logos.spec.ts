import { PNG } from 'pngjs';
import { ValidationPipe } from '@nestjs/common';
import { certificateLogos } from './certificate-logos';
import { legacyCertificateData as certificateData } from './certificate-data';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

function image(n = 1) {
  const png = new PNG({ width: 40, height: 20 });
  png.data.fill(n);
  return 'data:image/png;base64,' + PNG.sync.write(png).toString('base64');
}
const logo = { name: 'Partner One', data_url: image() };
const input = {
  recipient_name_ar: 'ليلى أحمد', recipient_name_en: 'Layla Ahmed', program_name_ar: 'القيادة', program_name_en: 'Leadership', signature_name: 'Ahmed Hassan',
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  recipient_name: 'Layla Ahmed',
  certificate_type: 'TRAINING',
  certificate_language: 'ar',
  program_name: 'القيادة',
  training_hours: 24,
  issued_at: '2026-09-22',
  partner_logos: [logo],
};
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

describe('certificate language and partner snapshots', () => {
  it.each([0, 1, 2, 3, 4])(
    'accepts %i distinct, normalized logo snapshots',
    (count) => {
      const logos = Array.from({ length: count }, (_, i) => ({
        name: `Partner ${i}`,
        data_url: image(i + 1),
      }));
      expect(certificateLogos(logos)).toHaveLength(count);
    },
  );
  it('persists language and image content rather than mutable remote URLs', () => {
    const result = certificateData(input);
    expect(result.certificate_language).toBe('ar');
    expect(result.template_version).toBe('2026.2');
    expect(result.partner_logos[0].data_url).toMatch(
      /^data:image\/png;base64,/,
    );
    expect(result.partner_logos[0].name).toBe('Partner One');
  });
  it('accepts logo DTOs on create/update', async () => {
    await expect(
      pipe.transform(input, { type: 'body', metatype: IssueCertificateDto }),
    ).resolves.toBeInstanceOf(IssueCertificateDto);
    await expect(
      pipe.transform(
        { partner_logos: [] },
        { type: 'body', metatype: UpdateCertificateDto },
      ),
    ).resolves.toBeInstanceOf(UpdateCertificateDto);
  });
  it.each([null, 'en-US', 'fr', undefined])(
    'rejects missing or unsupported language %s',
    (language) => {
      expect(() =>
        certificateData({ ...input, certificate_language: language }),
      ).toThrow();
    },
  );
  it('requires explicit language when upgrading an older record', () => {
    expect(() =>
      certificateData({ ...input, certificate_language: null }),
    ).toThrow();
  });
  it.each([
    null,
    [logo, logo],
    Array.from({ length: 5 }, (_, i) => ({ ...logo, data_url: image(i + 1) })),
    [{ ...logo, name: ' ' }],
    [{ ...logo, data_url: 'https://127.0.0.1/private' }],
    [{ ...logo, data_url: 'data:image/svg+xml;base64,PHN2Zy8+' }],
    [{ ...logo, data_url: 'data:image/png;base64,' + 'A'.repeat(90000) }],
    [{ ...logo, data_url: 'data:image/png;base64,AAAA' }],
  ])('rejects invalid or duplicate logo payload %j', (value) => {
    expect(() => certificateLogos(value)).toThrow();
  });
  it('rejects huge PNG dimensions before decompression', () => {
    const bytes = Buffer.from(logo.data_url.split(',')[1], 'base64');
    bytes.writeUInt32BE(100000, 16);
    expect(() =>
      certificateLogos([
        {
          ...logo,
          data_url: 'data:image/png;base64,' + bytes.toString('base64'),
        },
      ]),
    ).toThrow('no larger than 512');
  });
  it('rejects PNGs with corrupted payloads/CRC', () => {
    const bytes = Buffer.from(logo.data_url.split(',')[1], 'base64');
    bytes[35] ^= 0xff;
    expect(() =>
      certificateLogos([
        {
          ...logo,
          data_url: 'data:image/png;base64,' + bytes.toString('base64'),
        },
      ]),
    ).toThrow();
  });
  it('rejects arbitrary nested properties in logo DTOs', async () => {
    await expect(
      pipe.transform(
        { ...input, partner_logos: [{ ...logo, url: 'https://evil.example' }] },
        { type: 'body', metatype: IssueCertificateDto },
      ),
    ).rejects.toThrow();
  });
  it('preserves logo snapshots during unrelated edits and supports explicit clearing', () => {
    const saved = certificateData(input);
    expect(
      certificateData({ ...saved, training_hours: 40 }).partner_logos,
    ).toEqual(saved.partner_logos);
    expect(
      certificateData({ ...saved, partner_logos: [] }).partner_logos,
    ).toEqual([]);
  });
});
