export const BOARDS = ['CBSE', 'ICSE', 'State', 'Custom'] as const;
export const GRADES = [8, 9, 10, 11, 12] as const;

export const DEFAULT_SUBJECTS_BY_GRADE: Record<number, string[]> = {
  8: ['Mathematics', 'Science', 'Social Studies', 'English', 'Hindi'],
  9: ['Mathematics', 'Science', 'Social Studies', 'English', 'Hindi'],
  10: ['Mathematics', 'Science', 'Social Studies', 'English', 'Hindi'],
  11: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Accountancy', 'Economics', 'Business Studies'],
  12: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Accountancy', 'Economics', 'Business Studies'],
};

export const URGENCY_COLORS = {
  green: { days: 7, label: 'On Track' },
  amber: { days: 3, label: 'Approaching' },
  red: { days: 1, label: 'Urgent' },
} as const;

export const SRS_INTERVALS_HOURS: Record<number, number> = {
  0: 1,
  1: 24,
  2: 72,
  3: 168,    // 1 week
  4: 336,    // 2 weeks
  5: 720,    // 1 month
};

export const QUIZ_QUESTIONS_PER_CHAPTER = 12;
export const FLASHCARDS_PER_CHAPTER = 15;
export const CHUNK_SIZE_CHARS = 1500;
export const CHUNK_OVERLAP_CHARS = 200;
