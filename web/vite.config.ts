import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['localhost', '127.0.0.1', '.loca.lt', '.serveo.net', '.serveousercontent.com', '.trycloudflare.com'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 生成 sourcemap 方便线上问题排查
    sourcemap: false,
    // 分 chunk 策略：大库单独打包，减少主包体积
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) {
            return 'vendor-antd';
          }
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'vendor-charts';
          }
        },
      },
    },
  },
})
