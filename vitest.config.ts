import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    // Init i18next en FR avant chaque suite (les libellés FR rendent comme en prod).
    setupFiles: ["./src/test/setup.ts"],
    // L34 : le cœur pur de la chaîne de publication (`scripts/lib/*.mjs`) est
    // testé au même titre que le front — il décide de ce que les clients installent.
    include: ["src/**/*.{test,spec}.{ts,tsx}", "scripts/**/*.{test,spec}.mjs"],
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
