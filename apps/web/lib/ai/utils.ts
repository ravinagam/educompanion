/**
 * Strip markdown code fences that Claude sometimes wraps JSON in, then parse.
 * Throws a descriptive error if parsing fails.
 */
export function parseJSON<T>(text: string): T {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    console.error('[claude] Failed to parse JSON. Raw response:', text.slice(0, 300));
    throw new Error(`AI returned an unexpected response: ${text.slice(0, 120)}`);
  }
}

/**
 * Sample content from throughout the full text so generation covers ALL sections.
 * If content fits within maxChars, return it all.
 * Otherwise split into thirds and take an equal slice from start, middle, and end.
 */
export function sampleContent(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text ?? '';
  const third = Math.floor(maxChars / 3);
  const mid = Math.floor(text.length / 2);
  const start  = text.slice(0, third);
  const middle = text.slice(mid - Math.floor(third / 2), mid + Math.ceil(third / 2));
  const end    = text.slice(text.length - third);
  return (
    start  +
    '\n\n[... middle of chapter ...]\n\n' +
    middle +
    '\n\n[... later in chapter ...]\n\n' +
    end
  );
}
