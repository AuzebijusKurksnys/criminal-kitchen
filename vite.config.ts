import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
    exclude: ['pdfjs-dist/build/pdf.worker.min.js']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf': ['pdfjs-dist']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase to avoid warnings for PDF.js
  },
  server: {
    fs: {
      strict: false
    }
  }
})
