import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  {
    // Hors perimetre applicatif L0 : artefacts, outillage iakaframe et maquettes
    // de reference (HTML/JS non transpiles, pas du code de prod du cockpit).
    ignores: [
      "dist",
      "src-tauri",
      "coverage",
      "node_modules",
      "global",
      "specs",
      "*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Config files run in a Node context.
    files: ["*.config.{js,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Outillage Node ESM (scripts/) : gardes et utilitaires executes par `node`,
    // pas du code de prod du cockpit. On expose les globales Node *builtin*
    // (console, process, Buffer, URL...) et RIEN de plus.
    //
    // `nodeBuiltin` et NON `node` : le permissif `globals.node` declare aussi
    // `require`/`module`/`exports`/`__dirname`, ce qui laisserait passer sans
    // broncher du CommonJS dans un fichier ESM. L'instrument de mesure resterait
    // vert sur du code qui casserait a l'execution. Jurisprudence portefeuille (D-8).
    files: ["scripts/**"],
    languageOptions: {
      sourceType: "module",
      globals: globals.nodeBuiltin,
    },
  },
);
