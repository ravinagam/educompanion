import { describe, it, expect } from 'vitest';
import { claudePricing, VOYAGE_COST_PER_M, SARVAM_COST_PER_CHAR } from '@/lib/ai/usage';

describe('claudePricing', () => {
  it('returns Haiku rates for haiku model', () => {
    const p = claudePricing('claude-haiku-4-5-20251001');
    expect(p.input).toBe(0.80);
    expect(p.output).toBe(4.0);
  });

  it('returns Sonnet rates for sonnet model', () => {
    const p = claudePricing('claude-sonnet-4-6');
    expect(p.input).toBe(3.0);
    expect(p.output).toBe(15.0);
  });

  it('defaults to Sonnet rates for unknown model', () => {
    const p = claudePricing('claude-opus-99');
    expect(p.input).toBe(3.0);
    expect(p.output).toBe(15.0);
  });

  it('Haiku is cheaper than Sonnet on both input and output', () => {
    const haiku = claudePricing('claude-haiku-4-5-20251001');
    const sonnet = claudePricing('claude-sonnet-4-6');
    expect(haiku.input).toBeLessThan(sonnet.input);
    expect(haiku.output).toBeLessThan(sonnet.output);
  });
});

describe('cost calculations', () => {
  it('calculates correct Sonnet cost for 1M input + 1M output tokens', () => {
    const { input, output } = claudePricing('claude-sonnet-4-6');
    const cost = (1_000_000 * input + 1_000_000 * output) / 1_000_000;
    expect(cost).toBe(18.0); // $3 + $15
  });

  it('calculates correct Haiku cost for 1M input + 1M output tokens', () => {
    const { input, output } = claudePricing('claude-haiku-4-5-20251001');
    const cost = (1_000_000 * input + 1_000_000 * output) / 1_000_000;
    expect(cost).toBe(4.80); // $0.80 + $4.00
  });

  it('Haiku is ~75% cheaper than Sonnet on typical quiz generation', () => {
    const inputTokens = 3500;
    const outputTokens = 800;
    const sonnet = claudePricing('claude-sonnet-4-6');
    const haiku = claudePricing('claude-haiku-4-5-20251001');
    const sonnetCost = (inputTokens * sonnet.input + outputTokens * sonnet.output) / 1_000_000;
    const haikuCost  = (inputTokens * haiku.input  + outputTokens * haiku.output)  / 1_000_000;
    const saving = (sonnetCost - haikuCost) / sonnetCost;
    expect(saving).toBeGreaterThan(0.70);
  });
});

describe('VOYAGE_COST_PER_M', () => {
  it('is $0.06 per million tokens', () => {
    expect(VOYAGE_COST_PER_M).toBe(0.06);
  });

  it('costs less than $0.001 for a typical chapter (5000 tokens)', () => {
    const cost = (5000 * VOYAGE_COST_PER_M) / 1_000_000;
    expect(cost).toBeLessThan(0.001);
  });
});

describe('SARVAM_COST_PER_CHAR', () => {
  it('is derived from ₹15 per 10,000 chars at ₹94/USD', () => {
    const expected = 15 / 10_000 / 94;
    expect(SARVAM_COST_PER_CHAR).toBeCloseTo(expected, 10);
  });

  it('costs less than $0.01 for a typical slide (300 chars)', () => {
    const cost = 300 * SARVAM_COST_PER_CHAR;
    expect(cost).toBeLessThan(0.01);
  });
});
