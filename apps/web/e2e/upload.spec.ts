/**
 * Upload page E2E tests — authenticated view.
 */
import { test, expect } from '@playwright/test';

test.describe('Upload page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload');
  });

  test('loads the upload page', async ({ page }) => {
    await expect(page).toHaveURL(/\/upload/);
    await expect(page.getByRole('heading', { name: /upload chapter/i })).toBeVisible();
  });

  test('shows both upload mode toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /upload file/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /upload screenshots/i })).toBeVisible();
  });

  test('shows the consolidated file type hint', async ({ page }) => {
    // The single hint line below the mode toggle covers both modes
    // "File: PDF · Word (.docx) · Text (.txt) · max 50 MB | Photos: PNG · JPG · WEBP · max 30 pages"
    await expect(page.getByText(/File:.*PDF.*Photos:.*PNG/s)).toBeVisible();
  });

  test('file mode is the default and shows the drop zone', async ({ page }) => {
    // File mode is selected by default — drop zone for files should be visible
    await expect(page.getByText(/drop file here or click to browse/i)).toBeVisible();
  });

  test('switching to Screenshots mode shows the screenshot drop zone', async ({ page }) => {
    await page.getByRole('button', { name: /upload screenshots/i }).click();
    await expect(page.getByText(/drop screenshots here/i)).toBeVisible();
  });

  test('upload button is disabled without a subject and file', async ({ page }) => {
    // In file mode, upload button should be disabled until subject + file are chosen
    const uploadBtn = page.getByRole('button', { name: /upload chapter/i });
    await expect(uploadBtn).toBeDisabled();
  });

  test('subject creation form is visible', async ({ page }) => {
    // New subject name input is always visible
    await expect(page.getByPlaceholder(/subject name|science|maths/i)).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add' })).toBeVisible();
  });
});
