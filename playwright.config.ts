import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 0 : 0,
  workers: process.env['CI'] ? 2 : 1,
  timeout: 20_000,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Mobile Chrome (Pixel 7)',
      use: { ...devices['Pixel 7'] },
    },
    // WebKit uniquement en local — dépendances système trop lourdes en CI
    ...(!process.env['CI'] ? [{
      name: 'Mobile Safari (iPhone 14)',
      use: { ...devices['iPhone 14'] },
    }] : []),
  ],
  webServer: {
    // CI : sert le build statique (plus rapide que ng serve)
    // Local : réutilise ng serve s'il tourne déjà
    command: process.env['CI']
      ? 'serve dist/flow-ease/browser -p 4200 --single --no-clipboard'
      : 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
  },
});
