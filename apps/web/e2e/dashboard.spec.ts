/**
 * Dashboard page tests — authenticated view.
 * Relies on the auth state saved by auth.setup.ts.
 */
import { test, expect } from '@playwright/test';

test.describe('How to Use page', () => {
  test('loads and shows all five steps', async ({ page }) => {
    await page.goto('/how-to-use');
    await expect(page).toHaveURL(/\/how-to-use/);
    await expect(page.getByRole('heading', { name: /how to use/i })).toBeVisible();
    // All 5 step headings should be present
    for (const heading of ['Upload a chapter', 'Read it section by section', 'Test yourself', 'Ask AI anything', 'Track your progress']) {
      await expect(page.getByText(heading)).toBeVisible();
    }
  });

  test('nav link is visible in the sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /how to use/i })).toBeVisible();
  });

  test('CTA button links to /upload', async ({ page }) => {
    await page.goto('/how-to-use');
    const cta = page.getByRole('link', { name: /upload your first chapter/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/upload');
  });
});

test.describe('Dashboard', () => {
  test('loads and shows the dashboard heading', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    // Heading pattern: "{FirstName}'s Dashboard"
    await expect(page.getByRole('heading', { level: 1 })).toContainText("Dashboard");
  });

  test('has navigation links for key sections', async ({ page }) => {
    await page.goto('/dashboard');
    // Main nav should link to chapters, upload, profile
    await expect(page.getByRole('link', { name: /chapters/i }).first()).toBeVisible();
  });

  test('unauthenticated access redirects to login', async ({ page, context }) => {
    // Clear session for this test only
    await context.clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
