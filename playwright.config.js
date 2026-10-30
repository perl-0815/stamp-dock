import { defineConfig } from '@playwright/test';

const production = process.env.STAMPDOCK_TEST_PRODUCTION === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 3,
  timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5217', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: production ? 'npm start' : 'npm run dev', url: 'http://127.0.0.1:5217', reuseExistingServer: !production, timeout: 120000 },
});
