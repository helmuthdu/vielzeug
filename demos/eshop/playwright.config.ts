import { defineConfig } from 'playwright/test';

export default defineConfig({
  expect: { timeout: 5_000 },
  projects: [
    { name: 'desktop', use: { viewport: { height: 900, width: 1440 } } },
    { name: 'mobile', use: { hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } } },
  ],
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4176', trace: 'retain-on-failure' },
  webServer: {
    command: 'node_modules/.bin/vite --host 127.0.0.1 --port 4176',
    reuseExistingServer: true,
    url: 'http://127.0.0.1:4176',
  },
});
