import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env['CERTIFICATE_TEST_URL'] ?? 'http://127.0.0.1:4200',
    viewport: { width: 1440, height: 1100 },
    launchOptions: process.env['CHROMIUM_PATH']
      ? { executablePath: process.env['CHROMIUM_PATH'], args: ['--no-sandbox', '--no-zygote'] }
      : {},
  },
});
