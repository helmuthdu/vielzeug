import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4176', trace: 'retain-on-failure' },
  webServer: { command: 'bun run dev --host 127.0.0.1 --port 4176', port: 4176, reuseExistingServer: true },
});
