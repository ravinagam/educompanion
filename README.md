# EduCompanion — AI-Powered Study Partner

Smart learning app for students in grades 8–10. Upload study material, get personalized study plans for upcoming tests, and learn through AI-generated quizzes, flashcards, and video explanations.

## Architecture

```
EduCompanion/
├── apps/
│   ├── web/          # Next.js 14 (App Router) — Web app
│   └── mobile/       # Expo React Native — Mobile app
├── packages/
│   └── shared/       # Shared TypeScript types & constants
└── supabase/
    └── migrations/   # PostgreSQL migration files
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14+, Tailwind CSS, shadcn/ui |
| Mobile | Expo (React Native), NativeWind |
| Backend | Next.js API Routes (server-side only) |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth (email + Google SSO) |
| AI Content | Anthropic Claude API (claude-sonnet-4-6) |
| Embeddings | OpenAI text-embedding-3-small |
| File Storage | Supabase Storage |
| Notifications | Expo Push Notifications |

## Prerequisites

- Node.js 18+
- npm 9+
- Supabase account (free tier works)
- Anthropic API key
- OpenAI API key (for embeddings)

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd EduCompanion
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Enable the `pgvector` extension in your project's database settings
3. Run migrations:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   supabase login
   supabase link --project-ref your-project-ref
   supabase db push
   ```
   Or run migration files manually in the Supabase SQL editor (in order: 001 → 009).

4. In Supabase Dashboard → Authentication → Providers, enable:
   - Email (enabled by default)
   - Google (add your OAuth credentials)

5. In Supabase Dashboard → Authentication → URL Configuration, add:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 3. Environment Variables

**Web app** (`apps/web/.env.local`):
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI APIs (server-side only — never exposed to client)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Mobile app** (`apps/mobile/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 4. Run locally

**Web:**
```bash
npm run dev:web
# Opens at http://localhost:3000
```

**Mobile:**
```bash
npm run dev:mobile
# Scan QR code with Expo Go app
```

## Features

### Onboarding
- Sign up with email or Google SSO
- Select grade (8/9/10) and board (CBSE/ICSE/State/Custom)
- Choose subjects

### Chapter Upload
- Upload PDF, DOCX, TXT, or images (up to 50 MB)
- Automatic text extraction and chunking
- Vector embeddings stored in pgvector
- Status: Uploading → Processing → Ready

### Test Planner
- Create test with name, date, and chapter selection
- AI generates day-by-day study plan weighted by chapter complexity
- Color-coded urgency: 🟢 On Track / 🟡 Approaching / 🔴 Urgent
- Mark sessions complete

### AI Content (per chapter)
- **Quiz**: 12 MCQ/True-False/Fill-in-the-Blank questions via Claude — answers never sent to client before submission; scored server-side
- **Flashcards**: 15 term→definition pairs via Claude + SRS spaced repetition scheduling
- **Video Script**: Structured script with chaptered sections (intro, topics, summary) via Claude; ready for Remotion rendering

### Dashboard
- Today's study sessions with progress bar
- Upcoming tests with countdown and urgency
- Recent quiz scores
- Quick action shortcuts

### Mobile Notifications (Expo)
- Daily study reminder at customizable time
- Test countdown alerts
- Push notification registration on first launch

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chapters/upload` | Upload file, extract text, embed, store |
| GET | `/api/subjects` | List user's subjects with chapters |
| POST | `/api/subjects` | Create subject |
| POST | `/api/tests` | Create test + trigger study plan generation |
| GET | `/api/study-plan/:testId` | Get day-by-day study plan |
| PATCH | `/api/study-plan/:testId` | Mark plan item complete |
| POST | `/api/generate/quiz/:chapterId` | Generate quiz via Claude |
| GET | `/api/generate/quiz/:chapterId` | Get sanitized quiz (no answers) |
| POST | `/api/generate/flashcards/:chapterId` | Generate flashcards via Claude |
| GET | `/api/generate/flashcards/:chapterId` | Get flashcards with progress |
| POST | `/api/generate/video-script/:chapterId` | Generate video script via Claude |
| GET | `/api/generate/video-script/:chapterId` | Get video script |
| POST | `/api/quiz-attempts` | Submit quiz answers, get scored results |
| POST | `/api/flashcard-progress` | Update flashcard SRS status |
| GET | `/api/dashboard/:userId` | Dashboard aggregated data |

## Security

- All AI API keys are server-side only — never exposed to the browser
- Quiz answers are never sent to the client; scoring happens server-side in `/api/quiz-attempts`
- Supabase Row Level Security enforces data isolation per user
- Service role key used only in server-side admin operations

## Database Schema

See `supabase/migrations/` for complete SQL. Key tables:
- `users` — extends Supabase auth, stores grade/board/preferences
- `subjects` / `chapters` — chapter material with processing status
- `chapter_embeddings` — pgvector embeddings (1536-dim, IVFFlat indexed)
- `tests` / `study_plans` — test planner with day-by-day plan entries
- `quizzes` / `quiz_attempts` — quiz content and attempt history
- `flashcards` / `flashcard_progress` — SRS flashcard system
- `video_scripts` — AI-generated video scripts

## Extending

- **Remotion video rendering**: Replace the video player placeholder in `VideoClient.tsx` with a Remotion render pipeline using the `script_json`
- **D-ID/Synthesia**: Feed the video script to a talking avatar API and store the resulting `video_url`
- **Pinecone**: Swap `chapter_embeddings` with Pinecone client in `lib/ai/embeddings.ts` for larger scale
- **Whisper**: Add audio upload support in the upload route using OpenAI Whisper for transcription
"# educompanion" 
