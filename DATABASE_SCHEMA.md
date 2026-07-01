# EduCompanion Database Schema

Complete list of all tables in the Supabase PostgreSQL database (30 tables).

---

## **Core User & Profile Tables**

### 1. **users**
- Student and parent accounts
- Columns: id, email, name, grade, board, phone_number, referral_code, referred_by
- Auth-linked via Supabase Auth

### 2. **subjects**
- School subjects (Math, English, Hindi, etc.)
- Columns: id, user_id, name, created_at

### 3. **user_gamification**
- Student XP, level, streaks
- Columns: user_id, total_xp, level, current_streak, longest_streak, last_active_date

---

## **Chapter & Section Tables**

### 4. **chapters**
- Uploaded textbook chapters
- Columns: id, subject_id, name, file_url, file_name, file_size_bytes, content_text, upload_status, error_message, complexity_score, created_at

### 5. **chapter_sections**
- Sections within a chapter (auto-split by Claude)
- Columns: id, chapter_id, title, content_text, order_index, estimated_minutes

### 6. **section_progress**
- Student progress through sections
- Columns: user_id, section_id, completed_at

### 7. **chapter_images**
- Figures/diagrams extracted from PDFs
- Columns: id, chapter_id, image_url, page_num, order_idx, width, height

### 8. **chapter_embeddings** ⭐ (RAG)
- Vector embeddings for semantic search
- Columns: id, chapter_id, chunk_text, embedding_vector (pgvector), chunk_index

---

## **Quiz & Assessment Tables**

### 9. **quizzes**
- Chapter-level quizzes (auto-generated)
- Columns: id, chapter_id, questions_json, generated_at

### 10. **quiz_attempts**
- Student quiz submissions
- Columns: id, user_id, quiz_id, score, total, submitted_at

### 11. **chapter_mastery**
- Track mastery status per chapter
- Columns: user_id, chapter_id, mastered (bool), quiz_done (bool), flashcards_known (bool)

---

## **Flashcard Tables**

### 12. **flashcards**
- Term-definition flashcards (auto-generated)
- Columns: id, chapter_id, term, definition, created_at

### 13. **flashcard_progress**
- Student flashcard mastery (known/learning/new)
- Columns: user_id, flashcard_id, status (known/learning/new), last_reviewed_at

---

## **Content Generation Tables**

### 14. **chapter_summaries**
- Auto-generated summaries (quick_recap, key_points, etc.)
- Columns: id, chapter_id, summary_json, generated_at

### 15. **video_scripts**
- Auto-generated video scripts
- Columns: id, chapter_id, script_json, render_status (rendering/ready/error), error_message, generated_at

---

## **Study Plans & Tests**

### 16. **tests**
- Practice tests / exam preparation
- Columns: id, user_id, name, test_json, created_at

### 17. **study_plans**
- Generated study plans for tests
- Columns: id, test_id, user_id, plan_json, created_at

---

## **Gamification & Rewards Tables**

### 18. **user_gift_milestones**
- Track milestone progress (XP thresholds for vouchers)
- Columns: user_id, xp_milestone (3000/6000/10000/15000), voucher_inr, voucher_code, gifted_at, availed_at

---

## **Analytics & Tracking Tables**

### 19. **ai_usage_logs**
- Track Claude API costs per user
- Columns: id, user_id, operation (extraction/generation/Q&A), model, input_tokens, output_tokens, cost_usd, created_at

### 20. **feedback**
- User feedback & bug reports
- Columns: id, user_id, category, rating, message, created_at

---

## **Referral & Growth Tables**

### 21. **referrals**
- Referral tracking (referrer → referred user)
- Columns: id, referrer_id, referred_user_id, referral_code, created_at

### 22. **referral_clicks**
- Track when referral links are clicked
- Columns: id, referral_code, clicked_at

---

## **Parent Portal Tables**

### 23. **parent_insights**
- Cached insights for parent dashboard
- Columns: student_id, insights_json, generated_at, expires_at

---

## **Hindi-Specific Tables**

### 24. **hindi_worksheets**
- Hindi-specific study materials
- Columns: id, chapter_id, generated_at

---

## **Additional Tables (Future/Optional)**

### 25. **video_streams**
- If implementing video hosting

### 26. **assignment_submissions**
- Student assignment uploads

### 27. **progress_milestones**
- Detailed progress tracking

### 28. **achievement_badges**
- Gamification badges

### 29. **study_sessions**
- Time-tracking per subject

### 30. **notes**
- Student study notes

---

## **Table Relationships**

```
┌─ users (root)
│  ├─ subjects (user_id)
│  │  └─ chapters (subject_id)
│  │     ├─ chapter_sections (chapter_id)
│  │     ├─ chapter_images (chapter_id)
│  │     ├─ chapter_embeddings (chapter_id) — RAG
│  │     ├─ quizzes (chapter_id)
│  │     ├─ flashcards (chapter_id)
│  │     ├─ chapter_summaries (chapter_id)
│  │     └─ video_scripts (chapter_id)
│  │
│  ├─ user_gamification (user_id)
│  ├─ user_gift_milestones (user_id)
│  ├─ quiz_attempts (user_id)
│  ├─ flashcard_progress (user_id)
│  ├─ section_progress (user_id)
│  ├─ chapter_mastery (user_id)
│  ├─ tests (user_id)
│  ├─ study_plans (user_id)
│  ├─ ai_usage_logs (user_id)
│  ├─ feedback (user_id)
│  ├─ referrals (referrer_id)
│  └─ parent_insights (student_id)
│
└─ referral_clicks (referral_code)
```

---

## **Security: Row-Level Security (RLS)**

All user tables have RLS policies:
- Students can only see their own chapters, quizzes, progress
- Parents can only see their child's data
- Admins have unrestricted access via service role

---

## **Optimization Notes**

- **chapter_embeddings**: Uses pgvector for semantic search (RAG)
- **ai_usage_logs**: Track costs for billing/optimization
- **user_gift_milestones**: Immutable once milestone is reached
- **quiz_attempts**: Immutable submission history
- **chapter_mastery**: Denormalized from quiz_attempts + flashcard_progress for fast queries

---

## **Total Tables: 24 (+ 6 planned)**

**Core (14 tables):** users, subjects, chapters, chapter_sections, section_progress, quizzes, quiz_attempts, flashcards, flashcard_progress, chapter_summaries, video_scripts, chapter_embeddings, chapter_images, chapter_mastery

**Gamification (2 tables):** user_gamification, user_gift_milestones

**Analytics (2 tables):** ai_usage_logs, feedback

**Referrals (2 tables):** referrals, referral_clicks

**Parent Portal (1 table):** parent_insights

**Tests/Plans (2 tables):** tests, study_plans

**Hindi (1 table):** hindi_worksheets

---

**Est. Storage (for 1000 active students):**
- chapters + embeddings: ~500 MB
- quiz_attempts + progress: ~100 MB
- Other tables: ~50 MB
- **Total: ~650 MB** (well within Supabase free tier limits)
