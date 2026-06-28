import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// i18n initialisé AVANT le rendu (FR par défaut ; App applique `ui_lang`).
import "./i18n";

// Thème par défaut posé tôt (NaonEdge dark, mode B) pour éviter un flash avant
// que `useSettings` ne relise la préférence persistée et la réapplique.
document.documentElement.setAttribute("data-theme", "naonedge-dark");
document.documentElement.setAttribute("data-shape", "round");
document.documentElement.setAttribute("data-font", "system");
document.documentElement.setAttribute("data-density", "standard");

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Élément racine #root introuvable");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
