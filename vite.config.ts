import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      exclude: [/\.wasm$/],
      injectManifest: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB로 설정
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,ttf,otf}"], // .wasm 제외
        globIgnores: ["**/*.wasm", "**/*.map"], // .wasm 파일 및 .map 파일 제외
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,ttf,otf}"],
        runtimeCaching: [
          {
            urlPattern: /\/models\/.*\.onnx$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'model-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 } // 1 year
            }
          },
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 } // 1 year
            }
          }
        ],
      },
      manifest: {
        name: "Continuum",
        short_name: "Continuum",
        description: "오프라인 온디바이스 검색 PWA",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        share_target: {
          action: "/share",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [{ name: "files", accept: ["*/*"] }],
          },
        },
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable any" },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: process.env.VITE_API_BASE
      ? {
          "/api": { target: process.env.VITE_API_BASE, changeOrigin: true },
        }
      : undefined,
  },
  worker: {
    format: "es",
  },
});
