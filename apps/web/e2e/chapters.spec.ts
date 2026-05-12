/**
 * Chapters list page tests — authenticated view.
 */
import { test, expect } from '@playwright/test';

test.describe('Chapters page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chapters');
  });

  test('loads the chapters page', async ({ page }) => {
    await expect(page).toHaveURL(/\/chapters/);
    await expect(page.getByRole('heading', { name: 'My Saved Chapters' })).toBeVisible();
  });

  test('shows an Upload button', async ({ page }) => {
    // Present whether or not the user has any chapters
    await expect(page.getByRole('button', { name: /upload/i }).first()).toBeVisible();
  });

  test('upload button navigates to /upload', async ({ page }) => {
    await page.getByRole('link', { name: /upload/i }).first().click();
    await expect(page).toHaveURL(/\/upload/);
  });

  test('profile link is reachable', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);
    // Profile page renders the Profile Details card
    await expect(page.getByText(/profile details/i)).toBeVisible();
  });
});
