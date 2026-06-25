/**
 * PtyTerminal — terminal xterm.js RÉEL câblé sur une session PTY L1 (cœur L2).
 *
 * Présentationnel + effet : monte un `@xterm/xterm` (+ addon-fit), ouvre la
 * session via `usePty.open` (cwd = projet), branche :
 *   - flux Rust → `term.write` (callback onData passé à open) ;
 *   - saisie xterm → `pty.write` ;
 *   - resize (addon-fit + ResizeObserver) → `pty.resize` ;
 *   - fermeture session (closed) → notice ; fermeture d'onglet → `pty.close`
 *     (géré par le parent via `useGridState.closeTab`, qui démonte ce composant).
 *
 * Aucun I/O Tauri direct : tout passe par le hook `usePty` (lui-même via la
 * façade). xterm est bundlé local → compatible CSP stricte L0 (pas de CDN, pas
 * de WebGL ici : rendu DOM/canvas par défaut, cf. R-L2-5).
 */
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { UsePty } from "../hooks/usePty";

export interface PtyTerminalProps {
  /** id de session/onglet (unique). */
  sessionId: string;
  /** cwd à ouvrir (chemin du projet sous le chapeau). */
  cwd: string;
  /** Hook PTY partagé (fourni par le parent). */
  pty: UsePty;
}

export function PtyTerminal({
  sessionId,
  cwd,
  pty,
}: PtyTerminalProps): JSX.Element {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // `pty` est stable (callbacks mémorisés) mais on capture la version courante
  // pour l'effet d'init, qui ne doit s'exécuter qu'une fois par session.
  const ptyRef = useRef(pty);
  ptyRef.current = pty;

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily:
        'var(--mono), "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
      fontSize: 13,
      theme: { background: "#000000", foreground: "#f0f0f0" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    // Saisie clavier → PTY.
    const onDataDisp = term.onData((data) => {
      void ptyRef.current.write(sessionId, data);
    });

    // Resize : addon-fit recalcule cols/rows, on propage au PTY.
    const doResize = (): void => {
      try {
        fit.fit();
        void ptyRef.current.resize(sessionId, term.cols, term.rows);
      } catch {
        /* élément non monté / dimensions nulles : ignorer */
      }
    };
    const ro = new ResizeObserver(() => doResize());
    ro.observe(el);

    // Ouverture de la session : flux Rust → xterm.
    let closedNotified = false;
    void ptyRef.current.open(sessionId, cwd, term.cols, term.rows, {
      onData: (chunk) => term.write(chunk),
      onClosed: () => {
        if (closedNotified) return;
        closedNotified = true;
        term.write("\r\n\x1b[2m[session terminée]\x1b[0m\r\n");
      },
    });

    return () => {
      onDataDisp.dispose();
      ro.disconnect();
      // Ferme la session côté Rust + désabonne (anti-fuite R-L2-4).
      void ptyRef.current.close(sessionId);
      term.dispose();
    };
    // sessionId/cwd identifient la session : effet une fois par onglet (ptyRef
    // est une réf stable, donc hors dépendances).
  }, [sessionId, cwd]);

  return <div className="termmount" ref={mountRef} />;
}
