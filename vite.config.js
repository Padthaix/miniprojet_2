import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages เปิดเว็บที่ /miniprojet_2/ จึงตั้ง base ตอน build
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/miniprojet_2/' : '/',
  test: { include: ['src/**/*.test.{ts,tsx}'] },
  plugins: [react(), tailwindcss()],
}))
