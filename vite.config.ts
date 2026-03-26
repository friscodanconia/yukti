import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), cloudflare(), tailwindcss()],
  server: {
    hmr: false, // Disable HMR entirely — prevents page reloads during long requests
    watch: {
      ignored: ["**/.wrangler/**", "**/node_modules/**"],
    },
  },
});
