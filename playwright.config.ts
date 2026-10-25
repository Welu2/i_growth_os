import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, timeout: 40000, retries: 0,
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [ { name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'android-layout', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } } ],
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
});
