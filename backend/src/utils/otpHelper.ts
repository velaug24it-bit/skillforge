import crypto from 'crypto';
import { env } from '../config/env';

export const OTP_VALIDITY_SECONDS = 30;
export const MAX_FAILED_OTP_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export const generateSixDigitOtp = (): string => {
  // Generates integer in range [100000, 999999]
  const otpNumber = crypto.randomInt(100000, 1000000);
  return otpNumber.toString();
};

/**
 * Hash the OTP bound to the assessment attemptId and server secret.
 * Plaintext OTP is NEVER persisted in the database.
 */
export const hashOtp = (otp: string, attemptId: string): string => {
  const secret = env.JWT_SECRET || 'skillforge_otp_hmac_secret';
  return crypto
    .createHmac('sha256', secret)
    .update(`${otp}:${attemptId}`)
    .digest('hex');
};

/**
 * Verify plaintext OTP against stored hash
 */
export const verifyOtpHash = (otp: string, attemptId: string, storedHash: string): boolean => {
  const computedHash = hashOtp(otp, attemptId);
  try {
    // Timing-safe comparison to prevent timing side-channel attacks
    const bufA = Buffer.from(computedHash, 'utf8');
    const bufB = Buffer.from(storedHash, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};
