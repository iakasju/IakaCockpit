/**
 * PtyTerminal — terminal xterm.js RÉEL câblé sur une session PTY L1 (cœur L2).
 *
 * Présentationnel + effet : monte un `@xterm/xterm` (+ addon-fit), ouvre la
 * session via `usePty.open` (cwd = projet), branche :
 *   - flux Rust → `term.write` (callback onData passé à open) ;
 *   - saisie xterm → `pty.write` ;
 *   - resize (addon-fit + ResizeObserver) → `pty.resize` ;
 *   - fermeture session (closed) → notice. **L8/D4** : en mode chat, le parent garde
 *     ce composant MONTÉ et le masque en CSS (`display:none`) — il ne le démonte PAS,
 *     sinon le shell mourrait (R-L8-1). Le ResizeObserver refit le terminal quand il
 *     redevient visible. **L10b/R-L10b-1** : au démontage du composant on dispose
 *     UNIQUEMENT la surface xterm (term/onData/ResizeObserver) — on NE FERME PAS le
 *     runner : il doit survivre au remontage (navigation, `React.StrictMode`). Le spawn
 *     est idempotent côté `usePty` ; la fermeture passe par `usePty.close`.
 *
 * Aucun I/O Tauri direct : tout passe par le hook `usePty` (lui-même via la
 * façade). xterm est bundlé local → compatible CSP stricte L0 (pas de CDN, pas
 * de WebGL ici : rendu DOM/canvas par défaut, cf. R-L2-5).
 */
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { ChefRunnerKind } from "../api/backend";
import type { UsePty } from "../hooks/usePty";
import { deriveTermMetrics } from "../theme/termMetrics";
import { resolveMonoFamily } from "../theme/termFont";

/** Défaut historique (miroir de `DEFAULT_UI.termFontSize`) si le parent ne passe rien. */
const DEFAULT_TERM_FONT_SIZE = 13;

export interface PtyTerminalProps {
  /** id de session/onglet (unique). */
  sessionId: string;
  /** cwd à ouvrir (chemin du projet sous le chapeau). */
  cwd: string;
  /** Hook PTY partagé (fourni par le parent). */
  pty: UsePty;
  /**
   * Si défini (L10a), lance un CHEF-RUNNER dans le PTY (`claude` en TUI native pour
   * `"claude-code"`) au lieu du shell legacy. Le rendu et la frappe restent IDENTIQUES
   * (TUI native via `pty://output`, frappe → stdin) : seul le programme spawné change.
   */
  runnerKind?: ChefRunnerKind;
  /** Modèle du chef-runner (optionnel → défaut côté Rust ; réglage global = P3). */
  model?: string;
  /**
   * L22-P3 : allowlist `--allowedTools` DÉRIVÉE du Cadre de la team (PRIME sur le réglage
   * global côté Rust). Absente → repli global (zéro régression).
   */
  allowedTools?: string;
  /**
   * L22-P3 : texte de system-prompt DÉRIVÉ du Cadre (obligations + skills + brief),
   * ajouté APRÈS l'obligation coordinateur L19 côté Rust. Absent → seule L19 s'applique.
   */
  systemPromptExtra?: string;
  /**
   * Taille du texte du terminal en px (réglage `ui_term_font_size`) — SEULE entrée de
   * lisibilité. Interligne, espacement des caractères et respiration en sont dérivés par
   * `deriveTermMetrics` : le composant ne prend pas ces valeurs en props, sinon on pourrait
   * lui en passer d'incohérentes.
   *
   * Appliquée À CHAUD : un changement ne recrée NI la session PTY (garde L10 : le runner
   * survit) NI la surface xterm (le scrollback est conservé). Absente → défaut historique.
   */
  fontSize?: number;
}

export function PtyTerminal({
  sessionId,
  cwd,
  pty,
  runnerKind,
  model,
  allowedTools,
  systemPromptExtra,
  fontSize = DEFAULT_TERM_FONT_SIZE,
}: PtyTerminalProps): JSX.Element {
  // Source unique des métriques : une seule taille entre, tout le reste en découle.
  const metrics = deriveTermMetrics(fontSize);
  const mountRef = useRef<HTMLDivElement | null>(null);
  // Surface xterm exposée aux effets SECONDAIRES (taille de police) : ils doivent agir sur
  // le terminal VIVANT sans entrer dans les dépendances de l'effet d'init, dont le rejeu
  // recréerait la surface et perdrait le scrollback.
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  // Lue par l'effet d'init pour la taille INITIALE, hors dépendances (sinon un changement
  // de taille rejouerait l'init).
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

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
      // RÉSOLUE, jamais `var(--mono)` : xterm mesure le caractère via un canvas, où une
      // variable CSS est invalide — la mesure restait alors figée quelle que soit la
      // taille, et les glyphes se chevauchaient. Voir `theme/termFont`.
      fontFamily: resolveMonoFamily(),
      fontSize: metricsRef.current.fontSize,
      lineHeight: metricsRef.current.lineHeight,
      letterSpacing: metricsRef.current.letterSpacing,
      theme: { background: "#000000", foreground: "#f0f0f0" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

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

    // Ouverture de la session : flux Rust → xterm. En mode chef-runner (L10a), on
    // lance `claude` en TUI native (openRunner) ; sinon le shell legacy (open).
    let closedNotified = false;
    const opts = {
      onData: (chunk: string) => term.write(chunk),
      onClosed: () => {
        if (closedNotified) return;
        closedNotified = true;
        term.write("\r\n\x1b[2m[session terminée]\x1b[0m\r\n");
      },
    };
    if (runnerKind) {
      void ptyRef.current.openRunner(
        sessionId,
        runnerKind,
        model,
        cwd,
        term.cols,
        term.rows,
        opts,
        allowedTools,
        systemPromptExtra,
      );
    } else {
      void ptyRef.current.open(sessionId, cwd, term.cols, term.rows, opts);
    }

    return () => {
      onDataDisp.dispose();
      ro.disconnect();
      termRef.current = null;
      fitRef.current = null;
      term.dispose();
      // NE FERME PAS le runner ici (R-L10b-1) : le chef-runner doit SURVIVRE au
      // remontage du composant (navigation Working↔Portfolio, double-invocation des
      // effets sous `React.StrictMode` en dev). Fermer ici tuait le process `claude`
      // et, au remontage, en relançait un autre (nouveau `session_id`) → flux dédoublé
      // (bug shell 2×) + tailer du transcript jamais (re)démarré sur le bon (chat muet).
      // Le spawn est IDEMPOTENT et mémorisé dans `usePty` (`spawnRef`) ; la fermeture
      // effective passe par `usePty.close` (cycle de vie de la conversation / app).
    };
    // sessionId/cwd/runnerKind/model identifient la session : effet une fois par onglet
    // (ptyRef est une réf stable, donc hors dépendances). allowedTools/systemPromptExtra
    // (L22-P3) sont en deps mais le spawn est IDEMPOTENT (usePty.spawnRef) : si le Cadre
    // se charge APRÈS le 1er spawn, l'effet rejoue mais NE respawne pas (rebind seul) —
    // l'enforcement s'applique au spawn INITIAL, le repli global tient sinon (documenté).
  }, [sessionId, cwd, runnerKind, model, allowedTools, systemPromptExtra]);

  // Taille de police ET interligne À CHAUD. Effet SÉPARÉ, et c'est le point important :
  // mettre ces options
  // dans les dépendances de l'effet d'init aurait recréé la surface xterm à chaque cran de
  // réglage (scrollback perdu, flux rebranché). Ici on ne touche qu'aux options du terminal
  // vivant, puis on refitte — car changer la taille des glyphes change cols/rows, et le PTY
  // doit l'apprendre, sinon la TUI native rend sur une grille périmée (lignes tronquées).
  // Ne fait rien au premier rendu (l'init a déjà posé la bonne taille) : `term.options` est
  // idempotent, donc le cas est inoffensif et non gardé.
  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit) return;
    try {
      // Ré-résolue ici aussi : un changement de charte change `--mono`, et la police doit
      // suivre sans attendre un remontage du terminal.
      term.options.fontFamily = resolveMonoFamily();
      term.options.fontSize = metrics.fontSize;
      term.options.lineHeight = metrics.lineHeight;
      term.options.letterSpacing = metrics.letterSpacing;
      fit.fit();
      void ptyRef.current.resize(sessionId, term.cols, term.rows);
    } catch {
      /* surface non montée / dimensions nulles : le prochain ResizeObserver rattrapera */
    }
  }, [metrics.fontSize, metrics.lineHeight, metrics.letterSpacing, sessionId]);

  // La respiration autour de la grille suit la taille du texte : un padding figé à 10/14 px
  // paraît serré à 28 px de police. Posée en style inline (donc dérivée, pas réglée).
  return (
    <div
      className="termmount"
      ref={mountRef}
      style={{ padding: `${metrics.padY}px ${metrics.padX}px` }}
    />
  );
}
