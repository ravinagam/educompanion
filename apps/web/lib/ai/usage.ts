import { createAdminClient } from '@/lib/supabase/admin';

// claude-sonnet-4-6 pricing (USD per million tokens)
const INPUT_COST_PER_M  = 3.0;
const OUTPUT_COST_PER_M = 15.0;

// Voyage AI: $0.06 per 1M tokens (voyage-multilingual-2)
export const VOYAGE_COST_PER_M = 0.06;

// Sarvam AI: ₹15 per 10,000 chars → USD at ₹94
export const SARVAM_COST_PER_CHAR = 15 / 10_000 / 94;

export async function logAiUsage(
  userId: string,
  feature: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const cost = (inputTokens * INPUT_COST_PER_M + outputTokens * OUTPUT_COST_PER_M) / 1_000_000;
  const { error } = await createAdminClient().from('ai_usage_logs').insert({
    user_id: userId,
    feature,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: cost,
  });
  if (error) console.error('[ai-usage] log failed:', error.message);
}

// For non-Claude services where cost is calculated externally
export async function logCostDirect(
  userId: string,
  feature: string,
  model: string,
  units: number,
  costUsd: number
): Promise<void> {
  const { error } = await createAdminClient().from('ai_usage_logs').insert({
    user_id: userId,
    feature,
    model,
    input_tokens: units,
    output_tokens: 0,
    cost_usd: costUsd,
  });
  if (error) console.error('[ai-usage] log failed:', error.message);
}
