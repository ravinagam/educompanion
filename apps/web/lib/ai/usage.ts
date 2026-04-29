import { createAdminClient } from '@/lib/supabase/admin';

// claude-sonnet-4-6 pricing (USD per million tokens)
const INPUT_COST_PER_M  = 3.0;
const OUTPUT_COST_PER_M = 15.0;

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
