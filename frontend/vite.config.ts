import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://localhost:4000' } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: { provider: 'v8', include: ['src/**'], exclude: ['src/main.tsx', 'src/setupTests.ts', 'src/**/*.test.tsx'] },
  },
})
