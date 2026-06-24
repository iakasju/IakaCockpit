/**
 * backend.ts — UNIQUE point d'accès au backend Tauri.
 *
 * Règle d'architecture (D7) : tout appel `invoke` vers Rust passe par ce module.
 * Aucun composant ni hook ne doit importer `@tauri-apps/api/core` directement.
 * Ce découplage rend le backend mockable (tests, futur L2) et empêche le retour
 * d'un god-component qui mélangerait I/O et rendu.
 *
 * En L0, aucune commande Rust n'est encore exposée côté métier : on pose seulement
 * la couche. Les vraies commandes salvagées arrivent en L1.
 */
import { invoke } from "@tauri-apps/api/core";

/** Wrapper typé minimal autour de `invoke`. Seul endroit autorisé à l'appeler. */
export async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return invoke<T>(command, args);
}

/**
 * Détecte si l'on tourne dans un contexte Tauri (fenêtre native) plutôt qu'un
 * simple navigateur (dev front pur / tests). Évite de crasher hors Tauri.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Façade backend. Les méthodes métier (scan, portfolio, config…) seront ajoutées
 * en L1/L2 au-dessus de `call`. Exposé en objet pour faciliter le mock dans les tests.
 */
export const backend = {
  call,
  isTauri,
};

export type Backend = typeof backend;
