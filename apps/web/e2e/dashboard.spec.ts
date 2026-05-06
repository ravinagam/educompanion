/**
 * Dashboard page tests — authenticated view.
 * Relies on the auth state saved by auth.setup.ts.
 */
import { test, expect } from '@playwright/test';

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
