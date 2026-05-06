/**
 * Auth page tests — login form UI, validation, navigation.
 * Runs WITHOUT a saved session so we can test the unauthenticated state.
 */
import { test, expect } from '@playwright/test';

// Clear any stored session so these tests see the login page
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('renders the brand, heading, and form', async ({ page }) => {
    await expect(page.getByText('EaseStudy')).toBeVisible();
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('"Create account" link navigates to signup page', async ({ page }) => {
    await page.getByRole('link', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.getByText('Get started')).toBeVisible();
  });

  test('shows error toast for wrong credentials', async ({ page }) => {
    await page.getByLabel('Username').fill('definitely_not_a_real_user_xyz');
    await page.getByLabel('Password').fill('WrongPassword!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Invalid username or password')).toBeVisible({ timeout: 8_000 });
  });

  test('valid credentials redirect to /dashboard', async ({ page }) => {
    const username =
      process.env.TEST_STUDENT_USERNAME ??
      process.env.TEST_STUDENT_EMAIL?.split('@')[0] ??
      '';
    const password = process.env.TEST_STUDENT_PASSWORD ?? '';

    test.skip(!username || !password, 'Set TEST_STUDENT_USERNAME/EMAIL and PASSWORD to run this test');

    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});

test.describe('Signup page', () => {
  test('renders the form with required fields', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByText('Get started')).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeDisabled();
  });

  test('"Sign in" link navigates back to login', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
