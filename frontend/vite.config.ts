/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Matches production, where Caddy proxies /api to the backend service.
    proxy: { "/api": "http://localhost:3000" },
  },
  test: {
    environment: "jsdom",
  },
});
