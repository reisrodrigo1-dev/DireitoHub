
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Ler variáveis de ambiente do .env
const envPath = path.resolve(process.cwd(), '.env')
let envVars = {}
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && key.startsWith('VITE_OPENAI_API_KEY')) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
    }
  })
}

const openaiApiKey = envVars.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY

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
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, '/v1'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Adicionar Authorization header
            if (openaiApiKey) {
              proxyReq.setHeader('Authorization', `Bearer ${openaiApiKey}`);
              console.log('🔑 API Key configurada no proxy');
            } else {
              console.error('❌ API Key não encontrada para o proxy');
            }
          });
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
