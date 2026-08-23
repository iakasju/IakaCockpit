/**
 * Taille de police du terminal (`ui_term_font_size`).
 *
 * Le défaut réparé : xterm rend dans son propre canvas et ne suit PAS `--fscale`, donc
 * l'échelle de police de l'interface laissait le shell figé à 13 px. On ajoute un réglage
 * dédié, persisté, applicable à chaud.
 *
 * Le point qui compte n'est pas « la taille change » mais « elle change SANS tuer la
 * session » : la garde L10 (le runner survit) doit tenir à chaque cran de réglage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
  cleanup,
  renderHook,
} from "@testing-library/react";

// --- Stub xterm : jsdom n'a ni canvas ni mesure de glyphes. On garde une surface
// observable (options, cols/rows, dispose) pour prouver le comportement à chaud.
const fitSpy = vi.fn();
const disposeSpy = vi.fn();
const terminals: {
  options: { fontSize?: number; lineHeight?: number; letterSpacing?: number };
  cols: number;
  rows: number;
}[] = [];
vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    options: { fontSize?: number; lineHeight?: number; letterSpacing?: number };
    cols = 80;
    rows = 24;
    constructor(opts: { fontSize?: number; lineHeight?: number; letterSpacing?: number }) {
      this.options = { ...opts };
      terminals.push(this);
    }
    loadAddon(): void {}
    open(): void {}
    write(): void {}
    onData(): { dispose: () => void } {
      return { dispose: () => {} };
    }
    dispose(): void {
      disposeSpy();
    }
  },
}));
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {
    fit(): void {
      fitSpy();
    }
  },
}));
vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

import { PtyTerminal } from "../components/PtyTerminal";
import { ProjectTabs } from "../components/ProjectTabs";
import {
  clampTermFontSize,
  parsePrefsExport,
  useSettings,
  CONFIG_KEYS,
  DEFAULT_UI,
  TERM_FONT_MAX,
  TERM_FONT_MIN,
} from "../hooks/useSettings";
import { deriveTermMetrics } from "../theme/termMetrics";
import type { UsePty } from "../hooks/usePty";
import type { Backend } from "../api/backend";

afterEach(cleanup);

beforeEach(() => {
  terminals.length = 0;
  fitSpy.mockClear();
  disposeSpy.mockClear();
});

// ResizeObserver n'existe pas en jsdom.
globalThis.ResizeObserver = class {
  observe(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

function makePty(): UsePty {
  return {
    open: vi.fn(async () => {}),
    openRunner: vi.fn(async () => {}),
    write: vi.fn(async () => {}),
    resize: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  } as unknown as UsePty;
}

describe("bornage", () => {
  it("clampTermFontSize borne, arrondit et retombe sur le défaut si non fini", () => {
    expect(clampTermFontSize(1)).toBe(TERM_FONT_MIN);
    expect(clampTermFontSize(999)).toBe(TERM_FONT_MAX);
    expect(clampTermFontSize(17.4)).toBe(17);
    expect(clampTermFontSize(Number.NaN)).toBe(DEFAULT_UI.termFontSize);
  });
});

describe("dérivation — un seul réglage gouverne tout", () => {
  it("l'interligne n'est JAMAIS le 1.0 de xterm, à aucune taille", () => {
    // Régression visée : avec 1.0, la ligne fait exactement la hauteur d'un caractère
    // (mesuré : 22 px -> 25 px de ligne) et les glyphes se touchent.
    for (let px = TERM_FONT_MIN; px <= TERM_FONT_MAX; px++) {
      expect(deriveTermMetrics(px).lineHeight).toBeGreaterThan(1.15);
    }
  });

  it("l'interligne RELATIF décroît quand le texte grossit (convention typographique)", () => {
    const small = deriveTermMetrics(10).lineHeight;
    const mid = deriveTermMetrics(17).lineHeight;
    const large = deriveTermMetrics(24).lineHeight;
    expect(small).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(large);
  });

  it("l'interligne ABSOLU croît quand même avec la taille (le texte respire plus)", () => {
    // Le piège du point précédent : un ratio décroissant pourrait annuler le gain. On
    // vérifie la hauteur de ligne RÉELLE, modèle mesuré au banc (cellule ~ px x 1.15 x lh).
    const cell = (px: number) => px * 1.15 * deriveTermMetrics(px).lineHeight;
    expect(cell(20)).toBeGreaterThan(cell(13));
    expect(cell(28)).toBeGreaterThan(cell(20));
  });

  it("l'espacement des caractères est dérivé à ZÉRO à toute taille", () => {
    // Mesuré en capture d'écran : dès 1 px, les bordures de boîte des TUI (Claude Code,
    // Codex) se hachent en pointillés. Ce zéro est une contrainte de rendu, pas un oubli.
    for (let px = TERM_FONT_MIN; px <= TERM_FONT_MAX; px++) {
      expect(deriveTermMetrics(px).letterSpacing).toBe(0);
    }
  });

  it("la respiration suit la taille, et NE BOUGE PAS au défaut (zéro régression visuelle)", () => {
    const d = deriveTermMetrics(DEFAULT_UI.termFontSize);
    expect([d.padY, d.padX]).toEqual([10, 14]); // padding historique de `.termmount`
    const big = deriveTermMetrics(26);
    expect(big.padY).toBeGreaterThan(d.padY);
    expect(big.padX).toBeGreaterThan(d.padX);
  });

  it("monotone et bornée : aucune taille ne produit de valeur absurde", () => {
    for (let px = TERM_FONT_MIN; px <= TERM_FONT_MAX; px++) {
      const m = deriveTermMetrics(px);
      expect(m.lineHeight).toBeLessThanOrEqual(1.35);
      expect(m.lineHeight).toBeGreaterThanOrEqual(1.2);
      expect(m.padY).toBeGreaterThan(0);
      expect(m.padX).toBeGreaterThan(0);
    }
  });
});

describe("persistance", () => {
  it("parsePrefsExport lit ui_term_font_size, et IGNORE une valeur hors bornes", () => {
    expect(parsePrefsExport({ [CONFIG_KEYS.termFontSize]: "18" }).termFontSize).toBe(18);
    // Hors bornes → défaut, jamais une taille absurde persistée à la main.
    expect(parsePrefsExport({ [CONFIG_KEYS.termFontSize]: "400" }).termFontSize).toBe(
      DEFAULT_UI.termFontSize,
    );
    expect(parsePrefsExport({}).termFontSize).toBe(DEFAULT_UI.termFontSize);
  });

  it("la clé ne matche pas le filtre secret (elle doit remonter par configAll)", () => {
    expect(/token|key|secret|password/i.test(CONFIG_KEYS.termFontSize)).toBe(false);
  });

  it("setUiPref('termFontSize') écrit dans ui_term_font_size, PAS dans ui_font_scale", async () => {
    // Régression visée : la cascade de `setUiPref` finit par un fourre-tout `fontScale` —
    // une préférence ajoutée sans sa branche irait silencieusement écraser l'échelle UI.
    const store: Record<string, string> = {};
    const api = {
      configAll: vi.fn(async () => ({ ...store })),
      getRoot: vi.fn(async () => "/root"),
      configSet: vi.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      configGet: vi.fn(async () => null),
      aiHasKey: vi.fn(async () => false),
      couchHasCredentials: vi.fn(async () => false),
      n8nHasToken: vi.fn(async () => false),
    } as unknown as Backend;

    const { result } = renderHook(() => useSettings({ api, dom: null }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.setUiPref("termFontSize", 18);
    });
    expect(store[CONFIG_KEYS.termFontSize]).toBe("18");
    expect(store[CONFIG_KEYS.fontScale]).toBeUndefined();
    expect(result.current.ui.termFontSize).toBe(18);
    expect(result.current.ui.fontScale).toBe(DEFAULT_UI.fontScale);
  });
});

describe("PtyTerminal — application à chaud", () => {
  it("la SEULE prop de taille suffit : interligne et espacement en sont dérivés", () => {
    render(<PtyTerminal sessionId="s1" cwd="/w/p" pty={makePty()} fontSize={18} />);
    const expected = deriveTermMetrics(18);
    expect(terminals[0].options.fontSize).toBe(18);
    expect(terminals[0].options.lineHeight).toBe(expected.lineHeight);
    expect(terminals[0].options.letterSpacing).toBe(0);
  });

  it("un changement de taille N'OUVRE PAS une nouvelle session (garde L10)", async () => {
    const pty = makePty();
    const { rerender } = render(
      <PtyTerminal
        sessionId="s1"
        cwd="/w/p"
        pty={pty}
        runnerKind="claude-code"
        fontSize={13}
      />,
    );
    expect(pty.openRunner).toHaveBeenCalledTimes(1);
    const created = terminals.length;

    rerender(
      <PtyTerminal
        sessionId="s1"
        cwd="/w/p"
        pty={pty}
        runnerKind="claude-code"
        fontSize={20}
      />,
    );

    // Le runner n'est PAS relancé et la surface xterm n'est PAS recréée : c'est ce qui
    // distingue un réglage de confort d'un redémarrage de session.
    expect(pty.openRunner).toHaveBeenCalledTimes(1);
    expect(terminals.length).toBe(created);
    expect(disposeSpy).not.toHaveBeenCalled();
    // La taille est appliquée au terminal VIVANT, et le PTY apprend la nouvelle grille
    // (sinon la TUI native rendrait sur des cols/rows périmées).
    expect(terminals[0].options.fontSize).toBe(20);
    await waitFor(() => expect(pty.resize).toHaveBeenCalledWith("s1", 80, 24));
  });

  it("changer la taille change AUSSI l'interligne à chaud, sans rouvrir la session", async () => {
    // Le défaut terrain : la taille bougeait, l'interligne non — donc illisible.
    const pty = makePty();
    const props = {
      sessionId: "s1",
      cwd: "/w/p",
      pty,
      runnerKind: "claude-code" as const,
    };
    const { rerender } = render(<PtyTerminal {...props} fontSize={12} />);
    const before = terminals[0].options.lineHeight;
    rerender(<PtyTerminal {...props} fontSize={26} />);
    expect(terminals[0].options.fontSize).toBe(26);
    expect(terminals[0].options.lineHeight).toBe(deriveTermMetrics(26).lineHeight);
    expect(terminals[0].options.lineHeight).not.toBe(before);
    expect(pty.openRunner).toHaveBeenCalledTimes(1);
    expect(disposeSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(pty.resize).toHaveBeenCalled());
  });
});

describe("ProjectTabs — réglage rapide", () => {
  const base = {
    conversations: [],
    activeProjectId: null,
    onSelect: () => {},
    onClose: () => {},
    focus: false,
    onToggleFocus: () => {},
  };

  it("A+ / A− émettent la taille voulue (le bornage vit chez l'appelant)", () => {
    const onTermFontSize = vi.fn();
    render(
      <ProjectTabs {...base} termFontSize={13} onTermFontSize={onTermFontSize} />,
    );
    expect(screen.getByText("13 px")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Agrandir/i }));
    expect(onTermFontSize).toHaveBeenLastCalledWith(14);
    fireEvent.click(screen.getByRole("button", { name: /Réduire/i }));
    expect(onTermFontSize).toHaveBeenLastCalledWith(12);
  });

  it("sans callback, aucun groupe rendu (rétro-compat)", () => {
    render(<ProjectTabs {...base} />);
    expect(screen.queryByText(/px$/)).toBeNull();
  });
});
