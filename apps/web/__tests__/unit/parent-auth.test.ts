import { describe, it, expect } from 'vitest';
import { phoneToParentEmail, normalizePhone } from '@/lib/parent-auth';

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
