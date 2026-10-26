/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5190 },
  build: {
    rollupOptions: {
      output: {
        // Supabase fica fora do bundle inicial da vitrine
        manualChunks: { supabase: ['@supabase/supabase-js'] },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
  },
})
