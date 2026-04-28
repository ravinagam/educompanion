// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Board = 'CBSE' | 'ICSE' | 'State' | 'Custom';
export type Grade = 8 | 9 | 10;
export type UploadStatus = 'uploading' | 'processing' | 'ready' | 'error';
export type FlashcardStatus = 'known' | 'unknown';
export type VideoRenderStatus = 'pending' | 'rendering' | 'ready' | 'error';

export interface User {
  id: string;
  name: string;
  email: string;
  grade: Grade;
  board: Board;
  notification_time?: string; // HH:MM
  expo_push_token?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  upload_status: UploadStatus;
  content_text?: string;
  file_url?: string;
  complexity_score?: number; // 1–10, computed from content length + density
  created_at: string;
  subject?: Subject;
}

export interface ChapterEmbedding {
  id: string;
  chapter_id: string;
  chunk_text: string;
  chunk_index: number;
  created_at: string;
}

export interface Test {
  id: string;
  user_id: string;
  name: string;
  test_date: string; // ISO date
  chapter_ids: string[];
  created_at: string;
  chapters?: Chapter[];
}

export interface StudyPlan {
  id: string;
  test_id: string;
  day_date: string; // ISO date
  chapter_id: string;
  topics: string[];
  estimated_minutes: number;
  is_completed?: boolean;
  chapter?: Chapter;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'fill_blank';
  question: string;
  options?: string[];       // MCQ only
  correct_answer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  chapter_id: string;
  questions_json: QuizQuestion[];
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  answers_json: Record<string, string>; // question_id → chosen answer
  taken_at: string;
}

export interface Flashcard {
  id: string;
  chapter_id: string;
  term: string;
  definition: string;
  created_at: string;
}

export interface FlashcardProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  status: FlashcardStatus;
  next_review_at: string;
  review_count: number;
  flashcard?: Flashcard;
}

export interface VideoScript {
  id: string;
  chapter_id: string;
  script_json: VideoScriptContent;
  video_url?: string;
  render_status: VideoRenderStatus;
  created_at: string;
}

export interface VideoScriptContent {
  title: string;
  sections: VideoSection[];
}

export interface VideoSection {
  id: string;
  type: 'intro' | 'topic' | 'summary';
  title: string;
  bullets: string[];
  duration_seconds: number;
  timestamp_seconds: number;
  image_queries?: string[];  // 1–2 exact Wikipedia article titles for slide images
  image_label?: string;      // short label for the transformation arrow (when 2 images)
  /** @deprecated use image_queries instead */
  image_query?: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface DashboardData {
  today_plans: StudyPlan[];
  upcoming_tests: (Test & { days_remaining: number })[];
  recent_quiz_attempts: (QuizAttempt & { chapter_name: string })[];
  chapter_mastery: { chapter_id: string; chapter_name: string; mastery_percent: number }[];
  overall_completion: number;
}

export interface StudyPlanResponse {
  test: Test;
  plans: StudyPlan[];
  days_remaining: number;
}

// ─── Request Types ────────────────────────────────────────────────────────────

export interface CreateTestRequest {
  name: string;
  test_date: string;
  chapter_ids: string[];
}

export interface OnboardingRequest {
  name: string;
  grade: Grade;
  board: Board;
  subjects: string[];
}
