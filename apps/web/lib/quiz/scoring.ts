function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-().,:;'"\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract the leading letter from an MCQ option ("A) text..." or "A. text..." → "A")
function optionLetter(s: string): string | null {
  const m = s.trim().match(/^([A-Da-d])[).]\s/);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Compares a student's answer to the stored correct_answer, tolerating:
 *   – case differences
 *   – hyphens / punctuation  ("per-capita" ↔ "per capita")
 *   – word reordering        ("UNDP (United Nations...)" ↔ "United Nations... (UNDP)")
 *   – letter-only AI answers ("A" ↔ "A) Because individuals seek different goals")
 *     This handles quizzes where the AI returned only the option letter instead of
 *     the full option text, causing the student's full-text submission to fail matching.
 */
export function answersMatch(student: string, correct: string): boolean {
  if (!student) return false;

  // Fast path: exact match (covers True/False, perfect MCQ matches)
  if (student.trim() === correct.trim()) return true;

  const a = normalizeAnswer(student);
  const b = normalizeAnswer(correct);
  if (a === b) return true;

  // Word-set match: same words in any order (handles abbreviation reordering)
  const aWords = a.split(' ').filter(Boolean).sort();
  const bWords = b.split(' ').filter(Boolean).sort();
  if (aWords.length === bWords.length && aWords.every((w, i) => w === bWords[i])) return true;

  // Letter-only fallback: AI sometimes stores correct_answer as "A" instead of "A) full text".
  // Compare the leading letter of the student's selection to the correct answer letter.
  const studentLetter = optionLetter(student);
  const correctAsLetter = /^[A-Da-d]$/.test(correct.trim())
    ? correct.trim().toUpperCase()
    : optionLetter(correct);
  if (studentLetter && correctAsLetter && studentLetter === correctAsLetter) return true;

  return false;
}
