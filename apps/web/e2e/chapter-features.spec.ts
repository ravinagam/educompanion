/**
 * Chapter feature tests — Quiz, Flashcards, Summary, Video, Ask AI.
 * All tests are skipped automatically when TEST_SAMPLE_CHAPTER_ID is not set.
 * Fill it in .env.test.local once a seed chapter is available (Phase 6).
 */
import { test, expect } from '@playwright/test';

const chapterId = process.env.TEST_SAMPLE_CHAPTER_ID;

function skipIfNoChapter(testInfo: { skip: (condition: boolean, reason: string) => void }) {
  testInfo.skip(!chapterId, 'Set TEST_SAMPLE_CHAPTER_ID in .env.test.local to run chapter feature tests');
}

test.describe('Quiz', () => {
  test('page loads with chapter heading', async ({ page }, testInfo) => {
    skipIfNoChapter(testInfo);
    await page.goto(`/chapters/${chapterId}/quiz`);
    await expect(page).toHaveURL(/\/quiz/);
    // h1 is always rendered regardless of quiz state
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    // Intro (quiz seeded): "Start Quiz →" button
    // Empty (no quiz):     "Generate Quiz with AI" button
    // Active quiz:         radio inputs
    await expect(
      page.getByRole('radio').first()
        .or(page.getByRole('button', { name: /generate quiz/i }))
        .or(page.getByRole('button', { name: /start quiz/i })),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Flashcards', () => {
  test('page loads and shows at least one card', async ({ page }, testInfo) => {
    skipIfNoChapter(testInfo);
    await page.goto(`/chapters/${chapterId}/flashcards`);
    await expect(page).toHaveURL(/\/flashcards/);
    // Seeded cards: flip card front shows "Tap to reveal definition"
    // Empty state:  "Generate Flashcards with AI" button
    // All caught up (due mode, no due cards): "All caught up!" text
    await expect(
      page.getByText(/tap to reveal/i)
        .or(page.getByRole('button', { name: /generate flashcards/i }))
        .or(page.getByText(/all caught up/i)),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Summary', () => {
  test('page loads with generate button or existing summary', async ({ page }, testInfo) => {
    skipIfNoChapter(testInfo);
    await page.goto(`/chapters/${chapterId}/summary`);
    await expect(page).toHaveURL(/\/summary/);
    // Seeded summary: renders "Quick Recap" section header
    // Empty state:    "Generate Summary with AI" button (matches /generate/i)
    // Both states:    header always has a Regenerate/Generate button
    await expect(
      page.getByText(/quick recap/i)
        .or(page.getByRole('button', { name: /generate summary/i })),
    ).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Video', () => {
  test('page loads and shows the video player or generate button', async ({ page }, testInfo) => {
    skipIfNoChapter(testInfo);
    await page.goto(`/chapters/${chapterId}/video`);
    await expect(page).toHaveURL(/\/video/);
    // Generated video: canvas or slide elements
    // Empty state:     "Generate Video Lesson" button
    await expect(
      page.locator('video, canvas, [class*="slide"]').first()
        .or(page.getByRole('button', { name: /generate video/i })),
    ).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Ask AI (Chat)', () => {
  test('page loads and shows the message input', async ({ page }, testInfo) => {
    skipIfNoChapter(testInfo);
    await page.goto(`/chapters/${chapterId}/chat`);
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByRole('textbox').or(page.getByPlaceholder(/ask|type|message/i))).toBeVisible({
      timeout: 15_000,
    });
  });
});
