// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/diet-tracker-pwa/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '飲控賽巴斯欽 PWA',
        short_name: '飲控',
        description: 'Offline-First 飲食與體重追蹤系統',
        theme_color: '#88c0a8',
        background_color: '#f0f7f4',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // 快取所有靜態資源，確保離線秒開
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});