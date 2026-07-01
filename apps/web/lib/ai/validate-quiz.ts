import Anthropic from '@anthropic-ai/sdk';
import type { QuizQuestion } from '@educompanion/shared';

/**
 * OPTIMIZATION 3: Use Haiku to validate and fix quiz JSON formatting.
 * Haiku is 5-10× cheaper than Sonnet for this lightweight task.
 *
 * Catches:
 * - Missing fields (id, type, question, correct_answer)
 * - Invalid types (should be: mcq, true_false, fill_blank, assertion_reason)
 * - Malformed options (MCQs need exactly 4 options)
 * - Missing explanations
 */
export async function validateAndFixQuiz(
  quizJson: string,
  chapterName: string
): Promise<{ valid: boolean; data?: QuizQuestion[]; error?: string }> {
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const validationPrompt = `You are a JSON validator for quiz questions. Analyze this quiz JSON and fix any formatting issues.

VALID QUESTION TYPES:
- mcq: needs exactly 4 options (as array), correct_answer must be one of them
- true_false: options must be ["True", "False"]
- fill_blank: answer is a string, not array
- assertion_reason: needs assertion, reason, 4 options

REQUIRED FIELDS per question:
- id (string, e.g. "q1")
- type (one of: mcq, true_false, fill_blank, assertion_reason)
- question (string)
- correct_answer (string)
- explanation (string)
- options (array, except for fill_blank)

INPUT JSON:
${quizJson}

OUTPUT: Return ONLY valid JSON array, no markdown, no explanations.
Fix any formatting issues (missing fields, wrong option counts, etc).
If JSON is unfixable, return: {"error": "reason"}`;

  try {
    const message = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001', // OPTIMIZATION: Use cheaper Haiku for validation
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: validationPrompt
      }]
    });

    const responseText = (message.content[0] as { type: string; text: string }).text;

    // Handle error response
    if (responseText.includes('"error"')) {
      const errorObj = JSON.parse(responseText);
      return { valid: false, error: errorObj.error };
    }

    // Parse fixed JSON
    const fixed = JSON.parse(responseText) as QuizQuestion[];

    // Validate array structure
    if (!Array.isArray(fixed) || fixed.length === 0) {
      return { valid: false, error: 'Quiz is empty or not an array' };
    }

    // Spot-check first question
    const firstQ = fixed[0];
    if (!firstQ.id || !firstQ.type || !firstQ.question || !firstQ.correct_answer) {
      return { valid: false, error: 'Missing required fields in quiz' };
    }

    console.log(`[validate-quiz] Quiz for "${chapterName}" validated: ${fixed.length} questions fixed`);
    return { valid: true, data: fixed };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Validation failed: ${msg}` };
  }
}
