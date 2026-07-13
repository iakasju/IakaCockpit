/**
 * useIndexStatus — état de construction de l'index Analytics (2 phases). Poll BORNÉ de la façade
 * `analyticsIndexStatus` jusqu'à ce que la phase 2 (attribution) soit prête, puis s'arrête. Sert
 * l'indicateur « construction… » et déclenche le re-fetch de l'attribution une fois prête.
 *
 * Hors-Tauri (dev front pur / tests) : renvoie tout prêt (`{true, true}`) → aucun indicateur en
 * démo. `pollMs` = intervalle (défaut 700 ms) ; garde-fou de sécurité au bout de `maxTries`.
 */
import { useEffect, useState } from "react";
import { backend, type Backend, type IndexStatus } from "../api/backend";

const READY: IndexStatus = { tokens_ready: true, attrib_ready: true };

export function useIndexStatus(
  pollMs = 700,
  api: Backend = backend,
  maxTries = 40,
): IndexStatus {
  const [status, setStatus] = useState<IndexStatus>(() =>
    api.isTauri() ? { tokens_ready: false, attrib_ready: false } : READY,
  );

  useEffect(() => {
    if (!api.isTauri()) {
      setStatus(READY);
      return;
    }
    let alive = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = (): void => {
      tries += 1;
      api
        .analyticsIndexStatus()
        .then((s) => {
          if (!alive) return;
          setStatus(s);
          // Continue tant que la phase 2 n'est pas prête (et sous le plafond de sécurité).
          if (!s.attrib_ready && tries < maxTries) {
            timer = setTimeout(tick, pollMs);
          }
        })
        .catch(() => {
          // Échec (hors Tauri / commande absente) → on considère prêt pour ne pas coincer l'UI.
          if (alive) setStatus(READY);
        });
    };
    tick();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [api, pollMs, maxTries]);

  return status;
}
