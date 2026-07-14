/**
 * usePersistentState — `useState` avec persistance localStorage (préférences UI légères).
 *
 * Cible = petits toggles d'affichage front-pur (ex. Liste/Tuiles de l'Atelier, Arbre/Couloirs
 * des délégations) qui n'ont PAS à transiter par la config SQLite Rust (D7) : purement
 * cosmétiques, sans I/O backend. Le patron « config par façade » reste réservé aux réglages
 * métier persistés côté Rust (`useSettings`).
 *
 * Garde SSR / test-safe : tout accès à `window`/`localStorage` est borné (`typeof window`) et
 * try/catch (mode privé, quota, storage désactivé) → on retombe silencieusement sur la valeur
 * par défaut / la mémoire seule, sans jamais throw. Le défaut n'est appliqué qu'en l'absence de
 * valeur stockée valide (premier lancement inchangé).
 */
import { useCallback, useState } from "react";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible (mode privé, quota) → mémoire seule, jamais throw. */
  }
}

export function usePersistentState<T>(
  key: string,
  fallback: T,
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => read(key, fallback));

  const set = useCallback(
    (value: T) => {
      setState(value);
      write(key, value);
    },
    [key],
  );

  return [state, set];
}
