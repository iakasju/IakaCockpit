/**
 * useAppUpdate — état du contrôle de mise à jour de l'application (L34, D7).
 *
 * Un hook par préoccupation : porte une MACHINE À ÉTATS explicite
 * `idle → checking → up-to-date | available | downloading(pct) | ready | error`
 * et deux actions (`check`, `install`). AUCUN `invoke` ni import de plugin ici :
 * tout passe par la façade `backend.ts` (D7).
 *
 * Deux règles de comportement, non négociables :
 *
 * 1. **Le contrôle au démarrage est invisible quand il échoue.** Différé (~3 s),
 *    non bloquant, et un échec (box éteinte, LAN coupé, DNS, timeout) laisse
 *    l'état en `error` avec `visible: false` — aucune boîte de dialogue, aucune
 *    zone en erreur, UNE seule trace console. Une box éteinte ne doit jamais se
 *    voir (principe « iakabox optionnelle »).
 * 2. **Rien ne s'installe sans clic.** `install()` n'est jamais appelé par le
 *    hook lui-même ; il télécharge, installe, PUIS redémarre — dans cet ordre.
 *    Un second appel pendant l'opération est ignoré (garde anti-double-clic).
 *
 * Le contrôle MANUEL passe par le même chemin avec `verbose: true` : là, l'erreur
 * s'affiche (l'utilisateur a demandé, il mérite une réponse).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { backend, type Backend } from "../api/backend";

/** Délai avant le contrôle au démarrage (ms) — non bloquant, laisse l'app se monter. */
export const STARTUP_CHECK_DELAY_MS = 3000;

/** États de la machine. `error.visible` distingue le silence (démarrage) du bruit (manuel). */
export type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date" }
  | { status: "available"; version: string; notes: string | null }
  | {
      status: "downloading";
      version: string;
      downloaded: number;
      contentLength: number | null;
      /** Pourcentage entier 0-100, `null` tant que la taille totale est inconnue. */
      pct: number | null;
    }
  | { status: "ready"; version: string }
  | { status: "error"; message: string; visible: boolean };

export interface UseAppUpdate {
  state: UpdateState;
  /** Version installée (`null` tant qu'elle n'a pas pu être lue — jamais inventée). */
  currentVersion: string | null;
  /** Le bandeau a-t-il été fermé par l'utilisateur pour cette version ? */
  dismissed: boolean;
  /** Contrôle de version. `verbose` = l'erreur s'affiche. Ne rejette jamais. */
  check: (verbose?: boolean) => Promise<void>;
  /** Télécharge, installe, puis redémarre. Idempotent tant que l'opération court. */
  install: () => Promise<void>;
  /** Ferme le bandeau sans rien installer (D3). */
  dismiss: () => void;
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Injection de la façade pour les tests (défaut = vraie façade). */
export function useAppUpdate(api: Backend = backend): UseAppUpdate {
  const [state, setState] = useState<UpdateState>({ status: "idle" });
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  // La mise à jour en attente vit dans une ref : c'est un handle natif (il porte
  // une méthode), pas une donnée de rendu — il n'a rien à faire dans l'état React.
  const pendingRef = useRef<Awaited<ReturnType<Backend["checkUpdate"]>>>(null);
  const installingRef = useRef<boolean>(false);
  const startedRef = useRef<boolean>(false);

  const check = useCallback(
    async (verbose = false): Promise<void> => {
      setState({ status: "checking" });
      try {
        const update = await api.checkUpdate();
        pendingRef.current = update;
        if (!update) {
          setState({ status: "up-to-date" });
          return;
        }
        setCurrentVersion(update.currentVersion);
        setDismissed(false);
        setState({
          status: "available",
          version: update.version,
          notes: update.notes,
        });
      } catch (e) {
        const message = toMessage(e);
        // UNE trace, et une seule, quel que soit le mode : au démarrage c'est la
        // seule sortie ; en manuel elle double l'affichage à l'écran.
        console.warn("[update] contrôle de version impossible :", message);
        setState({ status: "error", message, visible: verbose });
      }
    },
    [api],
  );

  const install = useCallback(async (): Promise<void> => {
    const update = pendingRef.current;
    // Garde anti-double-clic : un second appel pendant l'opération ne relance
    // NI le téléchargement NI le redémarrage.
    if (!update || installingRef.current) return;
    installingRef.current = true;
    setState({
      status: "downloading",
      version: update.version,
      downloaded: 0,
      contentLength: null,
      pct: null,
    });
    try {
      await update.downloadAndInstall((p) => {
        if (p.kind === "started") {
          setState({
            status: "downloading",
            version: update.version,
            downloaded: 0,
            contentLength: p.contentLength,
            pct: p.contentLength ? 0 : null,
          });
        } else if (p.kind === "progress") {
          setState({
            status: "downloading",
            version: update.version,
            downloaded: p.downloaded,
            contentLength: p.contentLength,
            pct: p.contentLength
              ? Math.min(100, Math.round((p.downloaded / p.contentLength) * 100))
              : null,
          });
        }
      });
      setState({ status: "ready", version: update.version });
      await api.relaunchApp();
    } catch (e) {
      const message = toMessage(e);
      console.warn("[update] installation impossible :", message);
      // L'utilisateur a cliqué : l'échec se VOIT (contrepartie du silence au boot).
      setState({ status: "error", message, visible: true });
      installingRef.current = false;
    }
  }, [api]);

  const dismiss = useCallback((): void => {
    setDismissed(true);
  }, []);

  // Version installée : lue une fois, best-effort. Un échec (hors contexte Tauri)
  // laisse `currentVersion` à `null` — on n'affiche pas une version inventée.
  useEffect(() => {
    let alive = true;
    api
      .appVersion()
      .then((v) => {
        if (alive) setCurrentVersion(v);
      })
      .catch(() => {
        /* silencieux : l'absence de version n'est pas une erreur d'update */
      });
    return () => {
      alive = false;
    };
  }, [api]);

  // Contrôle au démarrage : différé, non bloquant, une seule fois par montage
  // (garde `startedRef` — StrictMode monte deux fois en dev).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const timer = setTimeout(() => {
      void check(false);
    }, STARTUP_CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [check]);

  return { state, currentVersion, dismissed, check, install, dismiss };
}
