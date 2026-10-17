import { createHash, randomInt, timingSafeEqual } from 'crypto';

export const generateOtp = (): string => randomInt(100000, 1000000).toString();

export const hashOtp = (otp: string): string => {
  const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET;
  if (!pepper) throw new Error('An OTP secret must be configured');
  return createHash('sha256').update(`${otp}:${pepper}`).digest('hex');
};

export const otpMatches = (plain: string, stored: string): boolean => {
  if (!/^\d{6}$/.test(plain) || !/^[a-f0-9]{64}$/.test(stored ?? '')) return false;
  return timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(hashOtp(plain), 'hex'));
};
