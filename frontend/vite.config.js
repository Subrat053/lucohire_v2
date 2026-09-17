import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('react-helmet-async') ||
              id.includes('react/')
            ) {
              return 'vendor-core';
            }
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('firebase') || id.includes('@react-oauth')) {
              return 'vendor-firebase';
            }
            if (id.includes('react-select') || id.includes('react-window')) {
              return 'vendor-widgets';
            }
            if (id.includes('axios') || id.includes('socket.io-client')) {
              return 'vendor-utils';
            }
          }
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=*',
      'Content-Security-Policy': "default-src 'self' https: http: blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://scripts.clarity.ms https://www.clarity.ms https://checkout.razorpay.com https://cdn.razorpay.com https://*.razorpay.com https://www.googletagmanager.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://accounts.google.com https://*.googleapis.com https://apis.google.com https://*.firebaseapp.com; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://scripts.clarity.ms https://www.clarity.ms https://checkout.razorpay.com https://cdn.razorpay.com https://*.razorpay.com https://www.googletagmanager.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://accounts.google.com https://*.googleapis.com https://apis.google.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: http: ws: wss:; worker-src 'self' blob:; frame-src 'self' https: http: https://www.youtube.com https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://www.google.com/recaptcha/ https://recaptcha.google.com/ https://*.firebaseapp.com;",
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/jobs/': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
