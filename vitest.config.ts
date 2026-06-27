import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // L14 : ne traiter (et donc rendre lisible via ?inline) que le CSS des chartes
    // généré ; le reste du CSS reste stubbé (rapide). Sert au test du CSS embarqué.
    css: { include: [/chartes\.css/] },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/main.tsx"],
    },
  },
});
