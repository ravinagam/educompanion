/**
 * Logs in once with the test student account and saves the browser session
 * to e2e/fixtures/.auth/student.json. All authenticated tests reuse this state.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = 'e2e/fixtures/.auth/student.json';

setup('authenticate as test student', async ({ page }) => {
  // Derive username from TEST_STUDENT_USERNAME, or fall back to the part
  // before @ in TEST_STUDENT_EMAIL (e.g. "student" from "student@test.example").
  const username =
    process.env.TEST_STUDENT_USERNAME ??
    process.env.TEST_STUDENT_EMAIL?.split('@')[0] ??
    '';
  const password = process.env.TEST_STUDENT_PASSWORD ?? '';

  if (!username || !password) {
    throw new Error(
      'Set TEST_STUDENT_USERNAME (or TEST_STUDENT_EMAIL) and TEST_STUDENT_PASSWORD in .env.test.local',
    );
  }

  await page.goto('/auth/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for the redirect to dashboard — confirms login succeeded
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Ensure the .auth directory exists before saving
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
