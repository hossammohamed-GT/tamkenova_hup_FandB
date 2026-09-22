import { jest } from '@jest/globals';
import { VerificationService } from '../verification/verification.service';

describe('versioned certificate verification', () => {
  const saved = {
    id: 'certificate',
    verification_code: 'TAM-0123456789ABCDEF',
    title: 'New Program',
    template_version: '2026.1',
    certificate_type: 'TRAINING',
    recipient_name: 'Name at issue',
    program_name: 'New Program',
    training_hours: 24,
    issued_at: new Date('2026-09-21'),
    is_valid: true,
    users: { full_name: 'Changed profile name' },
    training_programs: { title: 'Old linked program' },
    trainers: null,
  };
  function service(record: unknown) {
    return new VerificationService({
      getCertificateByCode: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue(record),
    } as any);
  }
  it('verifies the saved recipient and program rather than mutable profile or old relations', async () => {
    const result = await service(saved).verifyCertificate(
      saved.verification_code,
    );
    expect(result.verified).toBe(true);
    expect(result.certificate.holder.name).toBe('Name at issue');
    expect(result.certificate.program?.title).toBe('New Program');
  });
  it('reflects revocation without losing certificate details', async () => {
    const result = await service({
      ...saved,
      is_valid: false,
    }).verifyCertificate(saved.verification_code);
    expect(result.status).toBe('INVALID');
    expect(result.verified).toBe(false);
  });
  it('verifies both editions under one code without exposing the metadata envelope', async () => {
    const result = await service({
      ...saved,
      template_version: '2026.3',
      certificate_language: 'ar',
      description: JSON.stringify({
        schema: 'tamkeenova.certificate/2026.3',
        recipient_name_ar: 'ليلى أحمد',
        recipient_name_en: 'Layla Ahmed',
        signature_name: 'Ahmed Hassan',
      }),
    }).verifyCertificate(saved.verification_code);
    expect(result.certificate.available_languages).toEqual(['ar', 'en']);
    expect(result.certificate.recipient_name_ar).toBe('ليلى أحمد');
    expect(result.certificate.recipient_name_en).toBe('Layla Ahmed');
    expect(result.certificate.description).toBeNull();
    expect(result.certificate).not.toHaveProperty('signature_name');
    expect(result.certificate).not.toHaveProperty('partner_logos');
  });
  it('never verifies a non-issued preview code', async () => {
    await expect(
      service(null).verifyCertificate('PREVIEW-NOT-ISSUED'),
    ).rejects.toThrow('Certificate not found');
  });
});
