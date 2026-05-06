// Smoke test — verifies Vitest is wired up correctly.
// Delete this file once Phase 2 unit tests are in place.
import { describe, it, expect } from 'vitest';

describe('Vitest setup', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('has access to globals', () => {
    expect(typeof window).toBe('object'); // jsdom environment
  });
});
