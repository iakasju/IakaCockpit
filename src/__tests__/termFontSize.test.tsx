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
  options: { fontSize?: number; lineHeight?: number };
  cols: number;
  rows: number;
}[] = [];
vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    options: { fontSize?: number; lineHeight?: number };
    cols = 80;
    rows = 24;
    constructor(opts: { fontSize?: number; lineHeight?: number }) {
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
  clampTermLineHeight,
  parsePrefsExport,
  useSettings,
  CONFIG_KEYS,
  DEFAULT_UI,
  TERM_FONT_MAX,
  TERM_FONT_MIN,
  TERM_LINE_HEIGHT_MAX,
  TERM_LINE_HEIGHT_MIN,
} from "../hooks/useSettings";
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

describe("interligne", () => {
  it("le défaut N'EST PAS le 1.0 de xterm — c'est le correctif lui-même", () => {
    // Régression visée : avec 1.0, grossir la police resserre les lignes EN PROPORTION
    // (mesuré au labo : 22 px -> lignes de 25 px, soit 3 px d'air) et le shell devient
    // illisible. Le défaut doit donc donner de la marge.
    expect(DEFAULT_UI.termLineHeight).toBeGreaterThan(1);
  });

  it("clampTermLineHeight respecte le contrat xterm (jamais < 1)", () => {
    // xterm REFUSE une valeur < 1 : la borne basse n'est pas un goût, c'est la biblio.
    expect(clampTermLineHeight(0.5)).toBe(TERM_LINE_HEIGHT_MIN);
    expect(clampTermLineHeight(9)).toBe(TERM_LINE_HEIGHT_MAX);
    expect(clampTermLineHeight(Number.NaN)).toBe(DEFAULT_UI.termLineHeight);
  });

  it("parsePrefsExport lit ui_term_line_height et rejette le hors-bornes", () => {
    expect(
      parsePrefsExport({ [CONFIG_KEYS.termLineHeight]: "1.4" }).termLineHeight,
    ).toBe(1.4);
    expect(
      parsePrefsExport({ [CONFIG_KEYS.termLineHeight]: "0.4" }).termLineHeight,
    ).toBe(DEFAULT_UI.termLineHeight);
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
  it("pose la taille ET l'interligne reçus à la création du terminal", () => {
    render(
      <PtyTerminal
        sessionId="s1"
        cwd="/w/p"
        pty={makePty()}
        fontSize={18}
        lineHeight={1.4}
      />,
    );
    expect(terminals[0].options.fontSize).toBe(18);
    expect(terminals[0].options.lineHeight).toBe(1.4);
  });

  it("sans prop, l'interligne par défaut est > 1 (jamais le 1.0 de xterm)", () => {
    render(<PtyTerminal sessionId="s1" cwd="/w/p" pty={makePty()} />);
    expect(terminals[0].options.lineHeight).toBeGreaterThan(1);
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

  it("l'interligne change AUSSI à chaud, sans rouvrir la session", async () => {
    const pty = makePty();
    const props = {
      sessionId: "s1",
      cwd: "/w/p",
      pty,
      runnerKind: "claude-code" as const,
      fontSize: 20,
    };
    const { rerender } = render(<PtyTerminal {...props} lineHeight={1.25} />);
    expect(terminals[0].options.lineHeight).toBe(1.25);
    rerender(<PtyTerminal {...props} lineHeight={1.6} />);
    expect(terminals[0].options.lineHeight).toBe(1.6);
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
