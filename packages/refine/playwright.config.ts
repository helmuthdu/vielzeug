import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  fullyParallel: true,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: 'list',
  retries: process.env['CI'] ? 2 : 0,
  testDir: path.join(__dirname, 'src/__e2e__'),
  testMatch: '**/*.spec.ts',
  use: {
    // No base URL — tests use page.setContent() with IIFE scripts
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  workers: process.env['CI'] ? 2 : undefined,
});
