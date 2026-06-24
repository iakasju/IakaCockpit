import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IakaCockpit front (Tauri 2). Dev server on a project-dedicated port to avoid
// collisions with sibling iakaProject stacks.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 3020,
    strictPort: true,
  },
  build: {
    target: "es2020",
  },
});
