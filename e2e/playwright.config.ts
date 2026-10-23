import { defineConfig } from '@playwright/test'

/** Boots the real API (on a throwaway database) and the real web app, then drives them in Chrome. */
export default defineConfig({
  testDir: './tests',
  workers: 1, // one shared database, so scenarios run in order
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:5174', channel: process.env.CI ? undefined : 'chrome', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'rm -f .e2e.db* && DB_PATH=.e2e.db PORT=4100 npx --prefix ../backend tsx ../backend/src/server.ts',
      url: 'http://localhost:4100/api/health',
      reuseExistingServer: false,
    },
    {
      command: 'API_URL=http://localhost:4100 npm --prefix ../frontend run dev -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
    },
  ],
})
