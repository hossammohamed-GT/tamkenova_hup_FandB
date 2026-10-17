import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { hashOtp, otpMatches } from './utils/otp.util';

describe('Hashed one-use OTP and atomic consumption', () => {
  const previousPepper = process.env.OTP_PEPPER;
  afterAll(() => {
    if (previousPepper === undefined) delete process.env.OTP_PEPPER;
    else process.env.OTP_PEPPER = previousPepper;
  });
  let service: AuthService, repo: any;
  beforeEach(() => {
    process.env.OTP_PEPPER = 'test-only-otp-pepper';
    repo = {
      getLatestOtp: jest
        .fn<any>()
        .mockResolvedValue({
          id: 'otp',
          user_id: 'user',
          expires_at: new Date(Date.now() + 60000),
          attempt_count: 0,
          otp_code: hashOtp('123456'),
        }),
      markOtpUsed: jest.fn<any>().mockResolvedValue({ count: 1 }),
      incrementOtpAttempts: jest.fn<any>(),
      verifyUser: jest.fn<any>(),
    };
    service = new AuthService(repo, {} as any, {} as any);
  });
  it('never accepts legacy plaintext OTPs or malformed codes', () => {
    expect(otpMatches('123456', '123456')).toBe(false);
    expect(otpMatches('123456', hashOtp('123456'))).toBe(true);
    expect(otpMatches('123457', hashOtp('123456'))).toBe(false);
    expect(otpMatches('bad', hashOtp('123456'))).toBe(false);
  });
  it('lets only one concurrent request consume the code', async () => {
    repo.markOtpUsed
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const results = await Promise.allSettled([
      service.verifyEmail({ email: 'test@example.test', otp: '123456' }),
      service.verifyEmail({ email: 'test@example.test', otp: '123456' }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(repo.verifyUser).toHaveBeenCalledTimes(1);
  });
  it('never verifies on expired, exhausted or incorrect OTPs', async () => {
    repo.getLatestOtp.mockResolvedValueOnce({
      expires_at: new Date(0),
      attempt_count: 0,
    });
    await expect(
      service.verifyEmail({ email: 'x@test.test', otp: '123456' }),
    ).rejects.toThrow();
    repo.getLatestOtp.mockResolvedValueOnce({
      expires_at: new Date(Date.now() + 60000),
      attempt_count: 5,
    });
    await expect(
      service.verifyEmail({ email: 'x@test.test', otp: '123456' }),
    ).rejects.toThrow();
    await expect(
      service.verifyEmail({ email: 'x@test.test', otp: '000000' }),
    ).rejects.toThrow();
    expect(repo.markOtpUsed).not.toHaveBeenCalled();
    expect(repo.incrementOtpAttempts).toHaveBeenCalledTimes(1);
  });
  it('guards atomic database consumption against re-use, expiry and exhausted attempts', async () => {
    const updateMany = jest.fn<any>().mockResolvedValue({ count: 1 });
    const repository = new AuthRepository({
      email_otps: { updateMany },
    } as any);
    await repository.markOtpUsed('otp');
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'otp',
        is_used: false,
        expires_at: { gt: expect.any(Date) },
        attempt_count: { lt: 5 },
      },
      data: { is_used: true },
    });
  });
  it('increments failed-login counters atomically and locks the account at the database threshold', async () => {
    const update = jest
      .fn<any>()
      .mockResolvedValue({ failed_login_attempts: 5 });
    const transaction = { users: { update } };
    const repository = new AuthRepository({
      $transaction: async (callback: any) => callback(transaction),
    } as any);
    await repository.recordFailedLogin('user');
    expect(update.mock.calls[0][0].data).toEqual({
      failed_login_attempts: { increment: 1 },
    });
    expect(update.mock.calls[1][0].data.locked_until.getTime()).toBeGreaterThan(
      Date.now(),
    );
  });
});
