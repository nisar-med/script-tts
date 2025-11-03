import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    
    // In dev mode, optionally proxy Gemini API calls through mitmproxy for mocking
    const useMockProxy = env.VITE_USE_MOCK_PROXY === 'true';
    const mockProxyUrl = env.VITE_MOCK_PROXY_URL || 'http://localhost:8080';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: useMockProxy ? {
          // Proxy all Gemini API requests to mitmproxy
          '/v1beta': {
            target: mockProxyUrl,
            changeOrigin: true,
            secure: false,
            configure: (proxy, _options) => {
              proxy.on('error', (err, _req, _res) => {
                console.log('[Vite Proxy] Error connecting to mock proxy:', err.message);
                console.log('[Vite Proxy] Make sure mitmproxy is running on', mockProxyUrl);
              });
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                console.log('[Vite Proxy] Forwarding:', req.method, req.url, '→', mockProxyUrl);
              });
            },
          }
        } : undefined
      },
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
