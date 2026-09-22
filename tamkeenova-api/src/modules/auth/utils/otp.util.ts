import { createHash, randomInt } from 'crypto';

export const generateOtp = (): string => {
  return randomInt(100000, 1000000).toString();
};

export const hashOtp = (otp: string): string => {
  const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET || 'otp';
  return createHash('sha256').update(`${otp}:${pepper}`).digest('hex');
};

export const otpMatches = (plain: string, stored: string): boolean => {
  if (!stored) return false;
  if (stored === hashOtp(plain)) return true;
  return stored.length === 6 && stored === plain;
};
