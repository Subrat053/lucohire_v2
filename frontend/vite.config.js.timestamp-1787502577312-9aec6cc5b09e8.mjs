// vite.config.js
import { defineConfig } from "file:///D:/Lucohire_v1/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Lucohire_v1/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///D:/Lucohire_v1/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
import { visualizer } from "file:///D:/Lucohire_v1/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react-router-dom") || id.includes("react-helmet-async") || id.includes("react/")) {
              return "vendor-core";
            }
            if (id.includes("lucide-react") || id.includes("react-icons")) {
              return "vendor-icons";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("firebase") || id.includes("@react-oauth")) {
              return "vendor-firebase";
            }
            if (id.includes("react-select") || id.includes("react-window")) {
              return "vendor-widgets";
            }
            if (id.includes("axios") || id.includes("socket.io-client")) {
              return "vendor-utils";
            }
          }
        }
      }
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=*",
      "Content-Security-Policy": "default-src 'self' https: http: blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://scripts.clarity.ms https://www.clarity.ms https://checkout.razorpay.com https://cdn.razorpay.com https://*.razorpay.com https://www.googletagmanager.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://accounts.google.com https://*.googleapis.com https://apis.google.com https://*.firebaseapp.com; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://scripts.clarity.ms https://www.clarity.ms https://checkout.razorpay.com https://cdn.razorpay.com https://*.razorpay.com https://www.googletagmanager.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://accounts.google.com https://*.googleapis.com https://apis.google.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: http: ws: wss:; worker-src 'self' blob:; frame-src 'self' https: http: https://www.youtube.com https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://www.google.com/recaptcha/ https://recaptcha.google.com/ https://*.firebaseapp.com;"
    },
    proxy: {
      "/api": {
        target: "http://localhost:5055",
        changeOrigin: true
      },
      "/socket.io": {
        target: "http://localhost:5055",
        changeOrigin: true,
        ws: true
      },
      "/sitemap.xml": {
        target: "http://localhost:5055",
        changeOrigin: true
      },
      "/jobs/": {
        target: "http://localhost:5055",
        changeOrigin: true
      },
      "/robots.txt": {
        target: "http://localhost:5055",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxMdWNvaGlyZV92MVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcTHVjb2hpcmVfdjFcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0x1Y29oaXJlX3YxL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSc7XHJcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgdGFpbHdpbmRjc3MoKSxcclxuICAgIHZpc3VhbGl6ZXIoe1xyXG4gICAgICBmaWxlbmFtZTogJ2Rpc3Qvc3RhdHMuaHRtbCcsXHJcbiAgICAgIG9wZW46IGZhbHNlLFxyXG4gICAgICBnemlwU2l6ZTogdHJ1ZSxcclxuICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcclxuICAgIH0pLFxyXG4gIF0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XHJcbiAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygncmVhY3QtZG9tJykgfHxcclxuICAgICAgICAgICAgICBpZC5pbmNsdWRlcygncmVhY3Qtcm91dGVyLWRvbScpIHx8XHJcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3JlYWN0LWhlbG1ldC1hc3luYycpIHx8XHJcbiAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3JlYWN0LycpXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWNvcmUnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbHVjaWRlLXJlYWN0JykgfHwgaWQuaW5jbHVkZXMoJ3JlYWN0LWljb25zJykpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1pY29ucyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWNoYXJ0cycpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItY2hhcnRzJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2ZpcmViYXNlJykgfHwgaWQuaW5jbHVkZXMoJ0ByZWFjdC1vYXV0aCcpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItZmlyZWJhc2UnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3Qtc2VsZWN0JykgfHwgaWQuaW5jbHVkZXMoJ3JlYWN0LXdpbmRvdycpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3Itd2lkZ2V0cyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdheGlvcycpIHx8IGlkLmluY2x1ZGVzKCdzb2NrZXQuaW8tY2xpZW50JykpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci11dGlscyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIG1pbmlmeTogJ3RlcnNlcicsXHJcbiAgICB0ZXJzZXJPcHRpb25zOiB7XHJcbiAgICAgIGNvbXByZXNzOiB7XHJcbiAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxyXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeSc6ICdzYW1lLW9yaWdpbi1hbGxvdy1wb3B1cHMnLFxyXG4gICAgICAnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeSc6ICd1bnNhZmUtbm9uZScsXHJcbiAgICAgICdYLUNvbnRlbnQtVHlwZS1PcHRpb25zJzogJ25vc25pZmYnLFxyXG4gICAgICAnWC1GcmFtZS1PcHRpb25zJzogJ1NBTUVPUklHSU4nLFxyXG4gICAgICAnU3RyaWN0LVRyYW5zcG9ydC1TZWN1cml0eSc6ICdtYXgtYWdlPTMxNTM2MDAwOyBpbmNsdWRlU3ViRG9tYWlucycsXHJcbiAgICAgICdSZWZlcnJlci1Qb2xpY3knOiAnc3RyaWN0LW9yaWdpbi13aGVuLWNyb3NzLW9yaWdpbicsXHJcbiAgICAgICdQZXJtaXNzaW9ucy1Qb2xpY3knOiAnY2FtZXJhPSgpLCBtaWNyb3Bob25lPSgpLCBnZW9sb2NhdGlvbj0qJyxcclxuICAgICAgJ0NvbnRlbnQtU2VjdXJpdHktUG9saWN5JzogXCJkZWZhdWx0LXNyYyAnc2VsZicgaHR0cHM6IGh0dHA6IGJsb2I6IGRhdGE6OyBzY3JpcHQtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgJ3Vuc2FmZS1ldmFsJyBibG9iOiBkYXRhOiBodHRwczovL3NjcmlwdHMuY2xhcml0eS5tcyBodHRwczovL3d3dy5jbGFyaXR5Lm1zIGh0dHBzOi8vY2hlY2tvdXQucmF6b3JwYXkuY29tIGh0dHBzOi8vY2RuLnJhem9ycGF5LmNvbSBodHRwczovLyoucmF6b3JwYXkuY29tIGh0dHBzOi8vd3d3Lmdvb2dsZXRhZ21hbmFnZXIuY29tIGh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vcmVjYXB0Y2hhLyBodHRwczovL3d3dy5nc3RhdGljLmNvbS9yZWNhcHRjaGEvIGh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSBodHRwczovLyouZ29vZ2xlYXBpcy5jb20gaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20gaHR0cHM6Ly8qLmZpcmViYXNlYXBwLmNvbTsgc2NyaXB0LXNyYy1lbGVtICdzZWxmJyAndW5zYWZlLWlubGluZScgJ3Vuc2FmZS1ldmFsJyBibG9iOiBkYXRhOiBodHRwczovL3NjcmlwdHMuY2xhcml0eS5tcyBodHRwczovL3d3dy5jbGFyaXR5Lm1zIGh0dHBzOi8vY2hlY2tvdXQucmF6b3JwYXkuY29tIGh0dHBzOi8vY2RuLnJhem9ycGF5LmNvbSBodHRwczovLyoucmF6b3JwYXkuY29tIGh0dHBzOi8vd3d3Lmdvb2dsZXRhZ21hbmFnZXIuY29tIGh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vcmVjYXB0Y2hhLyBodHRwczovL3d3dy5nc3RhdGljLmNvbS9yZWNhcHRjaGEvIGh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSBodHRwczovLyouZ29vZ2xlYXBpcy5jb20gaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20gaHR0cHM6Ly8qLmZpcmViYXNlYXBwLmNvbTsgc3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbTsgZm9udC1zcmMgJ3NlbGYnIGRhdGE6IGh0dHBzOi8vZm9udHMuZ3N0YXRpYy5jb207IGltZy1zcmMgJ3NlbGYnIGRhdGE6IGJsb2I6IGh0dHBzOjsgY29ubmVjdC1zcmMgJ3NlbGYnIGh0dHBzOiBodHRwOiB3czogd3NzOjsgd29ya2VyLXNyYyAnc2VsZicgYmxvYjo7IGZyYW1lLXNyYyAnc2VsZicgaHR0cHM6IGh0dHA6IGh0dHBzOi8vd3d3LnlvdXR1YmUuY29tIGh0dHBzOi8vYXBpLnJhem9ycGF5LmNvbSBodHRwczovL2NoZWNrb3V0LnJhem9ycGF5LmNvbSBodHRwczovLyoucmF6b3JwYXkuY29tIGh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vcmVjYXB0Y2hhLyBodHRwczovL3JlY2FwdGNoYS5nb29nbGUuY29tLyBodHRwczovLyouZmlyZWJhc2VhcHAuY29tO1wiLFxyXG4gICAgfSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTA1NScsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICAnL3NvY2tldC5pbyc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwNTUnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICB3czogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgJy9zaXRlbWFwLnhtbCc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwNTUnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgJy9qb2JzLyc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwNTUnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgJy9yb2JvdHMudHh0Jzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTA1NScsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2UCxTQUFTLG9CQUFvQjtBQUMxUixPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsU0FBUyxrQkFBa0I7QUFFM0IsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osV0FBVztBQUFBLE1BQ1QsVUFBVTtBQUFBLE1BQ1YsTUFBTTtBQUFBLE1BQ04sVUFBVTtBQUFBLE1BQ1YsWUFBWTtBQUFBLElBQ2QsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGFBQWEsSUFBSTtBQUNmLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixnQkFDRSxHQUFHLFNBQVMsV0FBVyxLQUN2QixHQUFHLFNBQVMsa0JBQWtCLEtBQzlCLEdBQUcsU0FBUyxvQkFBb0IsS0FDaEMsR0FBRyxTQUFTLFFBQVEsR0FDcEI7QUFDQSxxQkFBTztBQUFBLFlBQ1Q7QUFDQSxnQkFBSSxHQUFHLFNBQVMsY0FBYyxLQUFLLEdBQUcsU0FBUyxhQUFhLEdBQUc7QUFDN0QscUJBQU87QUFBQSxZQUNUO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLFVBQVUsR0FBRztBQUMzQixxQkFBTztBQUFBLFlBQ1Q7QUFDQSxnQkFBSSxHQUFHLFNBQVMsVUFBVSxLQUFLLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFDMUQscUJBQU87QUFBQSxZQUNUO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLGNBQWMsS0FBSyxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQzlELHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxPQUFPLEtBQUssR0FBRyxTQUFTLGtCQUFrQixHQUFHO0FBQzNELHFCQUFPO0FBQUEsWUFDVDtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFVBQVU7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLGVBQWU7QUFBQSxNQUNqQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUCw4QkFBOEI7QUFBQSxNQUM5QixnQ0FBZ0M7QUFBQSxNQUNoQywwQkFBMEI7QUFBQSxNQUMxQixtQkFBbUI7QUFBQSxNQUNuQiw2QkFBNkI7QUFBQSxNQUM3QixtQkFBbUI7QUFBQSxNQUNuQixzQkFBc0I7QUFBQSxNQUN0QiwyQkFBMkI7QUFBQSxJQUM3QjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsTUFDQSxjQUFjO0FBQUEsUUFDWixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxJQUFJO0FBQUEsTUFDTjtBQUFBLE1BQ0EsZ0JBQWdCO0FBQUEsUUFDZCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxNQUNBLFVBQVU7QUFBQSxRQUNSLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLE1BQ0EsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
