/**
 * Dashboard page tests — authenticated view.
 * Relies on the auth state saved by auth.setup.ts.
 */
import { test, expect } from '@playwright/test';

test.describe('How to Use page', () => {
  test('loads and shows student and parent sections', async ({ page }) => {
    await page.goto('/how-to-use');
    await expect(page).toHaveURL(/\/how-to-use/);
    await expect(page.getByRole('heading', { name: /see how easestudy works/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /for students/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /for parents/i })).toBeVisible();
  });

  test('nav link is visible in the sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /how to use/i })).toBeVisible();
  });

  test('student Sign Up Free link points to /auth/signup', async ({ page }) => {
    await page.goto('/how-to-use');
    // First "Sign Up Free" is in the student section
    const cta = page.getByRole('link', { name: /sign up free/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/auth/signup');
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
