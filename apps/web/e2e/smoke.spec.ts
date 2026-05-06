// Smoke test — verifies Playwright can reach the app.
// Delete this file once Phase 4 E2E specs are in place.
import { test, expect } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
