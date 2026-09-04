/**
 * Identité du runner (2026-09-04) — CA-2, LA JONCTION qui compte.
 *
 * Le défaut cadré (`specs/instructions/identite-du-runner-badge-et-team.md`) : une team
 * liée pilote TOUT ce que le Cockpit AFFICHE, mais ne dit RIEN au runner lui-même — le
 * `systemPromptExtra` réellement transmis à `pty_runner_open` ne portait AUCUNE identité.
 * Un test de FONCTION PURE (`frameIdentity.test.ts`) ne peut pas voir ce défaut : il vit
 * dans le CÂBLAGE `App.tsx` (`resolveRunner`) → `WorkingView` → `PtyTerminal` →
 * `usePty.openRunner` → façade `ptyRunnerOpen` → `invoke("pty_runner_open", …)`. Ce
 * fichier monte l'App RÉELLE (calque `eagerOpenBootJunction.test.tsx`) et intercepte cet
 * appel — c'est le seul niveau qui aurait mordu le défaut d'origine (leçon L42-F1/L37-CA6,
 * § 6 F4 de l'instruction).
 *
 * xterm est stubbé (canvas/mesure absents en jsdom, calque `termFontSize.test.tsx`) mais
 * `PtyTerminal` N'EST PAS mocké : c'est lui qui appelle `usePty.openRunner`, donc le
 * mocker masquerait précisément la jonction qu'on veut éprouver.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import type { Project } from "../api/backend";

// --- Stub xterm (calque termFontSize.test.tsx) : jsdom n'a ni canvas ni mesure. ---
vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    options: Record<string, unknown> = {};
    cols = 80;
    rows = 24;
    constructor(opts: Record<string, unknown>) {
      this.options = { ...opts };
    }
    loadAddon(): void {}
    open(): void {}
    write(): void {}
    onData(): { dispose: () => void } {
      return { dispose: () => {} };
    }
    dispose(): void {}
  },
}));
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {
    fit(): void {}
  },
}));
vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

globalThis.ResizeObserver = class {
  observe(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(() => Promise.resolve(null)),
}));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: () => new Promise(() => {}) }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: () => Promise.resolve() }));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: () => Promise.resolve("0.0.0") }));

function project(over: Partial<Project> = {}): Project {
  return {
    id: "robotimmo",
    path: "/work/robotimmo",
    is_git: true,
    branch: "main",
    dirty: false,
    ahead: 0,
    behind: 0,
    last_commit_date: null,
    last_commit_subject: null,
    version: null,
    description: null,
    backlog_remaining: null,
    backlog_next: null,
    work_status: "stable",
    ...over,
  };
}

/** Team custom liée au projet — coordinateur "Boromir" (AUCUN rapport avec les 10 personas
 * canoniques du réservoir : preuve que l'identité vient bien de LA TEAM, pas d'un table de
 * secours codée en dur). */
const FELLOWSHIP_TEAM = [
  {
    id: "fellowship",
    name: "Fellowship",
    vignetteTeam: "lotr",
    coordinator: "boromir",
    agents: [
      {
        id: "boromir",
        name: "Boromir",
        royaume: "coordination",
        roleIndex: 1,
        runner: "claude-code",
        model: "",
        skills: [],
      },
    ],
  },
];

type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

function makeInvokeMock(): {
  invoke: InvokeFn;
  runnerOpenCalls: Record<string, unknown>[];
} {
  const runnerOpenCalls: Record<string, unknown>[] = [];
  const invoke = vi.fn((cmd: string, args?: Record<string, unknown>) => {
    switch (cmd) {
      case "get_root":
        return Promise.resolve("/work");
      case "config_get":
        return Promise.resolve(
          args?.key === "workset" ? "[]" : null,
        );
      case "config_all":
        return Promise.resolve({
          teams: JSON.stringify(FELLOWSHIP_TEAM),
          "project_team:robotimmo": "fellowship",
        });
      case "config_set":
        return Promise.resolve();
      case "scan_portfolio":
        return Promise.resolve([project()]);
      case "list_extra_projects":
        return Promise.resolve([]);
      case "latest_transcript":
        return Promise.resolve(null); // pas de session vivante → ouverture `owned`
      case "pty_runner_open":
        runnerOpenCalls.push(args ?? {});
        return Promise.resolve({
          session_id: "sid-1",
          transcript_path: "/tmp/sid-1.jsonl",
          started_at_ms: 0,
        });
      default:
        return new Promise(() => {}); // en attente (frame_load, seed_demo…) — inoffensif
    }
  });
  return { invoke, runnerOpenCalls };
}

let currentInvoke: InvokeFn;
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => currentInvoke(cmd, args),
}));

async function flushMicrotasks(times = 6): Promise<void> {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

beforeEach(() => {
  currentInvoke = () => new Promise(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Identité du runner — CA-2 (jonction team liée → arguments du spawn)", () => {
  it(
    "un projet lié à une team spawne le runner avec le PERSONA et le ROYAUME du projet " +
      "dans systemPromptExtra (pas 'claude', pas de royaume générique)",
    async () => {
      const { invoke, runnerOpenCalls } = makeInvokeMock();
      currentInvoke = invoke;

      const { default: App } = await import("../App");
      render(<App />);
      await flushMicrotasks(8);

      // Le projet apparaît dans l'Atelier (hors table) — geste utilisateur : le poser sur
      // la table (calque eagerOpenBootJunction.test.tsx, 2ᵉ cas).
      const putBtn = await screen.findByRole("button", {
        name: "↗ Poser sur la table",
      });
      fireEvent.click(putBtn);

      // Le spawn doit avoir lieu (navigation vers Travail + PtyTerminal monté).
      await waitFor(() => {
        expect(runnerOpenCalls.length).toBeGreaterThan(0);
      });

      const args = runnerOpenCalls[0];
      const extra = String(args.systemPromptExtra ?? "");
      // C'EST LE CŒUR DU CRITÈRE : le persona de la team liée, PAS "Claude".
      expect(extra).toContain("Boromir");
      // Royaume = id du projet EN MAJUSCULES (AR-6) — jamais la clé de rôle de la team
      // (ici "coordination", qui produirait un royaume faux `[COORDINATION][…]`).
      expect(extra).toContain("[ROBOTIMMO][Boromir]");
      expect(extra).not.toContain("COORDINATION");
    },
  );
});
