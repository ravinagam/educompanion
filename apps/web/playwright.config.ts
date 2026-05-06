import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env.test.local so env vars are available both in this config
// and forwarded to the Next.js dev server process.
const testEnvPath = path.resolve('.env.test.local');
const testEnv = fs.existsSync(testEnvPath) ? dotenv.parse(fs.readFileSync(testEnvPath)) : {};
dotenv.config({ path: testEnvPath, override: true });

const AUTH_FILE = 'e2e/fixtures/.auth/student.json';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3006',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // 1. Log in once and save session to AUTH_FILE
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // 2. Auth-page tests — run without a saved session so we can test the login form
    {
      name: 'auth-pages',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // 3. Authenticated tests — reuse the saved session from setup
    {
      name: 'chromium',
      testMatch: /(?<!auth\.)spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3006',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: Object.fromEntries(
      Object.entries({ ...process.env, ...testEnv }).filter((e): e is [string, string] => e[1] !== undefined)
    ),
  },
});
