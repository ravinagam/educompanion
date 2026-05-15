import { describe, it, expect } from 'vitest';
import { generateReferralCode } from '@/lib/utils/referral-code';

const ALLOWED_CHARS = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split(''));

describe('generateReferralCode', () => {
  it('generates a 6-character string', () => {
    expect(generateReferralCode()).toHaveLength(6);
  });

  it('only uses allowed characters', () => {
    const code = generateReferralCode();
    for (const ch of code) {
      expect(ALLOWED_CHARS.has(ch)).toBe(true);
    }
  });

  it('produces different codes across multiple calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateReferralCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
