import { describe, it, expect } from 'vitest';
import { phoneToParentEmail, normalizePhone, formatParentPhone } from '@/lib/parent-auth';

describe('phoneToParentEmail', () => {
  it('converts a plain 10-digit number', () => {
    expect(phoneToParentEmail('9876543210')).toBe('9876543210@parents.educompanion.app');
  });

  it('strips +91 country code and spaces', () => {
    expect(phoneToParentEmail('+91 98765 43210')).toBe('919876543210@parents.educompanion.app');
  });

  it('strips dashes and parentheses', () => {
    expect(phoneToParentEmail('(98765) 43210')).toBe('9876543210@parents.educompanion.app');
  });

  it('handles already-clean input', () => {
    expect(phoneToParentEmail('0987654321')).toBe('0987654321@parents.educompanion.app');
  });
});

describe('normalizePhone', () => {
  it('returns only digits', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('919876543210');
  });

  it('strips all non-digit characters', () => {
    expect(normalizePhone('(123) 456-7890')).toBe('1234567890');
  });

  it('returns empty string for non-numeric input', () => {
    expect(normalizePhone('abc')).toBe('');
  });

  it('leaves plain digits unchanged', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210');
  });
});

describe('formatParentPhone', () => {
  it('formats 12-digit number with +91 country code', () => {
    expect(formatParentPhone('919876543210')).toBe('+91 98765 43210');
  });

  it('formats 10-digit number without country code', () => {
    expect(formatParentPhone('9876543210')).toBe('98765 43210');
  });

  it('returns digits as-is for short numbers', () => {
    expect(formatParentPhone('0')).toBe('0');
  });

  it('strips non-digit chars before formatting', () => {
    expect(formatParentPhone('+91 98765-43210')).toBe('+91 98765 43210');
  });
});
