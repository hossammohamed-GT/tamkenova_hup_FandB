import { jest } from '@jest/globals';
import { AdminService } from './admin.service';

describe('certificate issue and edit workflow', () => {
  const payload = {
    user_id: 'holder',
    certificate_type: 'TRAINING' as const,
    recipient_name: 'Snapshot Name',
    program_name: 'Leadership',
    training_hours: 12,
    issued_at: '2026-09-21',
  };
  function setup() {
    const repository = {
      getUserById: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue({
          full_name: 'Profile Name',
          email: 'recipient@example.test',
        }),
      createCertificate: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockImplementation((data) =>
          Promise.resolve({ id: 'certificate', ...data }),
        ),
      getCertificateById: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue({
          ...payload,
          issued_at: new Date('2026-09-21'),
          verification_code: 'TAM-ORIGINAL',
          is_valid: false,
        }),
      updateCertificate: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockImplementation((_id, data) => Promise.resolve(data)),
      logActivity: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({}),
    };
    const mail = {
      sendCertificateIssuedEmail: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({}),
    };
    const notifications = {
      createNotification: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({}),
    };
    return {
      repository,
      service: new AdminService(
        repository as any,
        mail as any,
        notifications as any,
      ),
    };
  }
  it('issues with a random unique verification token and fixed template version', async () => {
    const { repository, service } = setup();
    const result = await service.issueCertificate('admin', payload);
    expect(result.certificate.verification_code).toMatch(/^TAM-[A-F0-9]{16}$/);
    expect(result.certificate.recipient_name).toBe('Snapshot Name');
    expect(repository.createCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 'holder',
        template_version: '2026.1',
      }),
    );
    expect(repository.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'admin' }),
    );
  });
  it('requires an existing recipient', async () => {
    const { repository, service } = setup();
    repository.getUserById.mockResolvedValue(null);
    await expect(service.issueCertificate('admin', payload)).rejects.toThrow(
      'User not found',
    );
    expect(repository.createCertificate).not.toHaveBeenCalled();
  });
  it('updates values without changing verification code, recipient account or revoked status', async () => {
    const { repository, service } = setup();
    await service.updateCertificate('certificate', { training_hours: 48 });
    const data = repository.updateCertificate.mock.calls[0][1];
    expect(data.training_hours).toBe(48);
    for (const key of ['verification_code', 'student_id', 'is_valid'])
      expect(data).not.toHaveProperty(key);
  });
  it('does not convert incomplete historical records', async () => {
    const { repository, service } = setup();
    repository.getCertificateById.mockResolvedValue({ recipient_name: null });
    await expect(
      service.updateCertificate('certificate', { training_hours: 24 }),
    ).rejects.toThrow();
    expect(repository.updateCertificate).not.toHaveBeenCalled();
  });
});
