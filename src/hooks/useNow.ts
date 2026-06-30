/**
 * useNow — ticker `Date.now()` front PUR (L20 B1). Pousse l'horloge dans l'état à intervalle
 * régulier pour que les vues dérivées du temps « vivent » entre deux snapshots : barres
 * `in_progress` qui grandissent, curseur « maintenant » qui avance, dépassement qui vire au
 * rouge — sans aucun backend.
 *
 * Économe : le ticker est EN PAUSE quand l'onglet est masqué (`document.hidden` /
 * `visibilitychange`) pour ne rien consommer en arrière-plan, et reprend (avec un tick
 * immédiat de rattrapage) au retour. Nettoyage strict de l'intervalle et de l'écouteur au
 * démontage (anti-fuite). MVP `useEffect`+`setInterval` borné (cf. cadrage L20 « état de
 * l'art » : voie acceptable face à `useSyncExternalStore`).
 */
import { useEffect, useState } from "react";

export function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    const tick = (): void => setNow(Date.now());
    const start = (): void => {
      if (id == null) {
        tick(); // rattrapage immédiat (au montage et au retour d'onglet)
        id = setInterval(tick, intervalMs);
      }
    };
    const stop = (): void => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = (): void => {
      if (document.hidden) stop();
      else start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}
