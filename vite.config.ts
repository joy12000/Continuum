/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 'prompt'에서 변경 - 자동 업데이트 활성화
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      exclude: [/\.wasm$/],
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB로 설정
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,ttf,otf,mp4}"], // .wasm 제외
        globIgnores: ["**/*.wasm", "**/*.map"], // .wasm 파일 및 .map 파일 제외
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,ttf,otf,mp4}"],
        skipWaiting: true, // false에서 변경 - 즉시 활성화
        clientsClaim: true,
      },
      manifest: {
        name: "Momentum",
        short_name: "Momentum",
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
          { src: "/icons/AI_192icon.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/AI_512icon.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/AI_512icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@lib": path.resolve(__dirname, "./lib"),
    },
  },
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
