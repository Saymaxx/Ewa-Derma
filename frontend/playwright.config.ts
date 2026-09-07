import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: process.env.CI
    ? [
        {
          command: 'cd ../backend && npm run start',
          url: 'http://localhost:4000/api/health',
          reuseExistingServer: true,
          timeout: 60000,
        },
        {
          command: 'npm run start',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 60000,
        },
      ]
    : undefined,
});
