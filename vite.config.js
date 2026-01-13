
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '.replit.dev',
      'a2813bf1-b224-4756-abe5-622334e68e03-00-33etfl79b10ns.picard.replit.dev'
    ],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*'
    },
    hmr: {
      clientPort: 443,
      host: 'localhost',
      timeout: 10000,
      overlay: false
    },
    proxy: {
      '/api/datajud': {
        target: 'https://api-publica.datajud.cnj.jus.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/datajud/, ''),
        headers: {
          'Authorization': 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
        }
      }
    }
  },
  preview: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '.replit.dev',
      'a2813bf1-b224-4756-abe5-622334e68e03-00-33etfl79b10ns.picard.replit.dev'
    ]
  },
  define: {
    global: 'globalThis'
  }
})
