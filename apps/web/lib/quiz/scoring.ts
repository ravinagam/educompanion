function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-().,:;'"\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compares a student's fill-in-the-blank answer to the correct answer
 * tolerating differences in case, hyphenation, punctuation, and word order.
 *
 * Examples that pass:
 *   "per-capita"  ↔  "per capita"
 *   "UNDP (United Nations Development Programme)"  ↔  "United Nations Development Programme (UNDP)"
 */
export function answersMatch(student: string, correct: string): boolean {
  if (!student) return false;
  const a = normalizeAnswer(student);
  const b = normalizeAnswer(correct);
  if (a === b) return true;
  // Word-set match: same words in any order (handles abbreviation reordering)
  const aWords = a.split(' ').filter(Boolean).sort();
  const bWords = b.split(' ').filter(Boolean).sort();
  return aWords.length === bWords.length && aWords.every((w, i) => w === bWords[i]);
}
