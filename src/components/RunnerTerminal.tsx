/**
 * RunnerTerminal — surface xterm.js du CHEF-RUNNER en pipes (L10 P1).
 *
 * Jumelle de `PtyTerminal` (même socle xterm bundlé → CSP stricte intacte), MAIS
 * branchée sur la couture **runner** (pipes), pas le PTY shell : `claude` refuse le
 * NDJSON sur un stdin TTY (finding spike P0) — d'où une surface dédiée. `PtyTerminal`
 * et `terminal.rs` (shell legacy) restent **inchangés**.
 *
 * Le terminal est la SOURCE : il est typeable. En P1 (avant l'entrée partagée chat de
 * P2), la frappe est bufferisée par ligne avec écho local ; **Entrée** envoie un TOUR
 * (`runner.write` → NDJSON `{"type":"user"}` côté Rust) ; **Échap** interrompt l'outil
 * en cours (`runner.interrupt` = `esc`, le process survit). Le FLUX BRUT du chef
 * (`runner://raw`) est écrit verbatim ; stderr est affiché grisé (diagnostics).
 *
 * Aucun I/O Tauri direct : tout passe par le hook `useRunner` (lui-même via la façade).
 */
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { RunnerKind } from "../api/backend";
import type { UseRunner } from "../hooks/useRunner";

export interface RunnerTerminalProps {
  /** id de session (stable, unique par conversation). */
  sessionId: string;
  /** cwd du projet (sous le chapeau) où lancer le chef-runner. */
  cwd: string;
  /** Type de runner (défaut `"claude-code"`). */
  kind?: RunnerKind;
  /** Modèle (optionnel → défaut côté Rust ; réglage global = P3). */
  model?: string;
  /** Hook runner partagé (fourni par le parent). */
  runner: UseRunner;
}

export function RunnerTerminal({
  sessionId,
  cwd,
  kind = "claude-code",
  model,
  runner,
}: RunnerTerminalProps): JSX.Element {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // `runner` est stable (callbacks mémorisés) ; on capture la version courante pour
  // l'effet d'init, qui ne doit s'exécuter qu'une fois par session.
  const runnerRef = useRef(runner);
  runnerRef.current = runner;

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

    // Buffer de ligne (P1) : la frappe est échoée localement ; Entrée envoie un tour.
    let lineBuf = "";

    const onDataDisp = term.onData((data) => {
      if (data === "\r") {
        // Entrée → envoie le tour bufferisé (s'il est non vide) puis reset.
        term.write("\r\n");
        const text = lineBuf;
        lineBuf = "";
        if (text.trim().length > 0) {
          void runnerRef.current.write(sessionId, text);
        }
      } else if (data === "\x7f" || data === "\b") {
        // Backspace : retire le dernier caractère (écho + buffer).
        if (lineBuf.length > 0) {
          lineBuf = lineBuf.slice(0, -1);
          term.write("\b \b");
        }
      } else if (data === "\x1b") {
        // Échap → interruption de l'outil en cours (esc ; le process survit).
        term.write("\r\n\x1b[33m[esc — interruption demandée]\x1b[0m\r\n");
        void runnerRef.current.interrupt(sessionId);
      } else {
        lineBuf += data;
        term.write(data);
      }
    });

    // Resize : addon-fit recalcule la géométrie d'affichage (pas de resize côté pipes).
    const doResize = (): void => {
      try {
        fit.fit();
      } catch {
        /* élément non monté / dimensions nulles : ignorer */
      }
    };
    const ro = new ResizeObserver(() => doResize());
    ro.observe(el);

    // Ouverture du runner : flux brut → xterm ; stderr grisé ; fin → notice.
    let closedNotified = false;
    void runnerRef.current.open(sessionId, kind, model, cwd, {
      onRaw: (line) => term.write(line + "\r\n"),
      onStderr: (line) => term.write(`\x1b[2m${line}\x1b[0m\r\n`),
      onClosed: () => {
        if (closedNotified) return;
        closedNotified = true;
        term.write("\r\n\x1b[2m[chef-runner terminé]\x1b[0m\r\n");
      },
    });

    return () => {
      onDataDisp.dispose();
      ro.disconnect();
      // Ferme le runner côté Rust + désabonne (anti-fuite).
      void runnerRef.current.close(sessionId);
      term.dispose();
    };
    // sessionId/cwd identifient la session : effet une fois par conversation.
  }, [sessionId, cwd, kind, model]);

  return <div className="termmount" ref={mountRef} />;
}
