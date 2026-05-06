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
    // h1 is always rendered regardless of whether a quiz exists yet
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    // Either a quiz is ready (radio options) or the generate button is shown
    await expect(
      page.getByRole('radio').first()
        .or(page.getByRole('button', { name: /generate quiz/i })),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Flashcards', () => {
  test('page loads and shows at least one card', async ({ page }, testInfo) => {
    skipIfNoChapter(testInfo);
    await page.goto(`/chapters/${chapterId}/flashcards`);
    await expect(page).toHaveURL(/\/flashcards/);
    // A card face should be visible
    await expect(page.locator('[data-card-face], .flashcard, [class*="card"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe('Summary', () => {
  test('page loads with generate button or existing summary', async ({ page }, testInfo) => {
    skipIfNoChapter(testInfo);
    await page.goto(`/chapters/${chapterId}/summary`);
    await expect(page).toHaveURL(/\/summary/);
    // Either a summary already exists (prose content) or the generate button is shown
    await expect(
      page.getByRole('button', { name: /generate summary/i })
        .or(page.locator('article, [class*="prose"]').first()),
    ).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Video', () => {
  test('page loads and shows the video player or slides', async ({ page }, testInfo) => {
    skipIfNoChapter(testInfo);
    await page.goto(`/chapters/${chapterId}/video`);
    await expect(page).toHaveURL(/\/video/);
    await expect(page.locator('video, canvas, [class*="slide"]').first()).toBeVisible({
      timeout: 20_000,
    });
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
