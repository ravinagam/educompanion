/**
 * Parent portal auth tests — landing page, parent login/register UI.
 * Runs WITHOUT a saved session (unauthenticated state).
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders EaseStudy brand and tagline', async ({ page }) => {
    await expect(page.getByText('EaseStudy').first()).toBeVisible();
    await expect(page.getByText(/partner for exams/i)).toBeVisible();
  });

  test('shows both Student and Parent login options', async ({ page }) => {
    await expect(page.getByText("I'm a Student")).toBeVisible();
    await expect(page.getByText("I'm a Parent")).toBeVisible();
  });

  test('Student card links to /auth/login', async ({ page }) => {
    await page.getByText("I'm a Student").click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('Parent card links to /parent-login', async ({ page }) => {
    await page.getByText("I'm a Parent").click();
    await expect(page).toHaveURL(/\/parent-login/);
  });

  test('signup link navigates to /auth/signup', async ({ page }) => {
    await page.getByRole('link', { name: /create a free account/i }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });
});

test.describe('Parent login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/parent-login');
  });

  test('renders Parent Portal heading and form', async ({ page }) => {
    await expect(page.getByText('Parent Portal')).toBeVisible();
    await expect(page.getByLabel('Parent Phone Number')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('shows "Create parent account" toggle link', async ({ page }) => {
    await expect(page.getByRole('button', { name: /create parent account/i })).toBeVisible();
  });

  test('switches to register mode when "Create parent account" is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /create parent account/i }).click();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
  });

  test('switches back to login mode from register mode', async ({ page }) => {
    await page.getByRole('button', { name: /create parent account/i }).click();
    // In register mode the toggle button text is "Sign in"
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByLabel('Parent Phone Number')).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).not.toBeVisible();
  });

  test('shows error toast for wrong credentials', async ({ page }) => {
    await page.getByLabel('Parent Phone Number').fill('9999999999');
    await page.getByLabel('Password').fill('WrongPassword123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(
      page.getByText(/incorrect phone number or password/i)
    ).toBeVisible({ timeout: 8_000 });
  });

  test('"Back to home" link returns to landing page', async ({ page }) => {
    await page.getByRole('link', { name: /back to home/i }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Parent route protection', () => {
  test('unauthenticated user visiting /parent is redirected to /parent-login', async ({ page }) => {
    await page.goto('/parent');
    await expect(page).toHaveURL(/\/parent-login/);
  });

  test('unauthenticated user visiting /parent/some-id is redirected to /parent-login', async ({ page }) => {
    await page.goto('/parent/00000000-0000-0000-0000-000000000000');
    await expect(page).toHaveURL(/\/parent-login/);
  });
});
