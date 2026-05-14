import Anthropic from '@anthropic-ai/sdk';

export interface SubjectSnapshot {
  name: string;
  chapters_total: number;
  chapters_mastered: number;
  mastery_pct: number;
  avg_quiz_score_pct: number | null;
  quiz_attempts_last_14d: number;
  flashcards_known: number;
  flashcards_total: number;
}

export interface InsightInput {
  student_name: string;
  grade: number;
  board: string;
  current_streak: number;
  days_since_active: number;
  active_days_last_30: number;
  overall_quiz_avg: number | null;
  exam_readiness_pct: number;
  subjects: SubjectSnapshot[];
}

export interface ParentInsight {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  alerts: string[];
  parent_message: string | null;
}

let _claude: Anthropic | null = null;
function getClaude() {
  if (!_claude) _claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _claude;
}

export async function generateParentInsights(input: InsightInput): Promise<ParentInsight> {
  const prompt = `You are an education advisor helping parents of Indian school students understand their child's learning progress on EaseStudy, an AI-powered learning platform.

Here is ${input.student_name}'s current study data (Grade ${input.grade}, ${input.board}):

${JSON.stringify(input, null, 2)}

Generate a helpful parent insight report in simple, reassuring language (avoid jargon).

Rules:
- Strengths: 2-3 genuine positives based on the data (mastery, streaks, scores)
- Weaknesses: 2-3 specific areas that need attention (low scores, skipped subjects, low mastery)
- Opportunities: 2-3 actionable growth opportunities (subjects near mastery, learning patterns)
- Threats: 1-2 risk factors (inactivity, upcoming exams with low readiness, subjects with 0 attempts)
- Recommendations: 3-5 specific, actionable suggestions the parent can share with the child
- Alerts: 0-3 urgent flags (e.g., inactive 5+ days, subject with 0 quiz attempts, exam readiness < 40%)
- Parent message: One warm, honest 1-sentence summary ("Arjun is making steady progress but needs focus on Science.")

If data is limited (new student), give encouraging generic insights appropriate for that grade.
Respond ONLY with valid JSON matching this exact structure, no markdown:
{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "opportunities": ["..."],
  "threats": ["..."],
  "recommendations": ["..."],
  "alerts": ["..."],
  "parent_message": "..."
}`;

  const response = await getClaude().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    temperature: 0.4,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    return JSON.parse(text) as ParentInsight;
  } catch {
    // Fallback if JSON parse fails
    return {
      strengths: ['Getting started with EaseStudy — keep it up!'],
      weaknesses: ['More data needed to identify specific areas to improve.'],
      opportunities: ['Daily study sessions will help build strong momentum.'],
      threats: ['Consistent practice is key before exams.'],
      recommendations: ['Complete at least one quiz per subject this week to get started.'],
      alerts: [],
      parent_message: null,
    };
  }
}
