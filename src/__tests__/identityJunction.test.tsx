/**
 * Identité du runner (2026-09-04) — CA-2 (lot L46), puis CA-3 (lot « Pastille du badge
 * du runner », 2026-09-04) : LES JONCTIONS qui comptent.
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
 *
 * **CA-3 (`specs/instructions/pastille-du-badge-runner.md`)** reprend EXACTEMENT le même
 * dispositif pour prouver que la pastille de phase atteint elle aussi l'argument réel du
 * spawn — la même leçon (L37-CA6, L42-F1) : une garde de fonction pure ne voit pas ce
 * défaut, seule la jonction mord.
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

/**
 * Lot « Pastille du badge du runner » (2026-09-04) — CA-3, LE CA QUI COMPTE.
 *
 * Ce test-ci est SÉPARÉ du précédent (au lieu d'y ajouter des assertions) pour que le CA-2
 * du lot L46 (ci-dessus) reste, à la lettre, INCHANGÉ (CA-7 : « passent SANS MODIFICATION
 * DE LEUR ATTENDU »).
 */
describe("Identité du runner — CA-3 (jonction, LE VERROU anti-témoin-vide)", () => {
  it(
    "un projet lié à une team dont le coordinateur porte royaume:coordination spawne le " +
      "runner avec le BADGE ASSEMBLÉ (pastille incluse) dans systemPromptExtra",
    async () => {
      const { invoke, runnerOpenCalls } = makeInvokeMock();
      currentInvoke = invoke;

      const { default: App } = await import("../App");
      const { identityPreamble } = await import("../frame/identity");

      // --- VERROU ANTI-TÉMOIN-VIDE (§ 6 F5 / CA-3 de l'instruction) --------------------
      // Sans ce verrou, ce test serait satisfait par le badge nom+royaume SEUL, que le lot
      // précédent produit DÉJÀ (cf. describe ci-dessus) — et resterait vert quoi qu'il
      // arrive, même si `resolveRunner` n'injectait jamais de pastille. On prouve d'abord,
      // sur la fonction PURE, que la chaîne assemblée attendue n'apparaît PAS quand aucune
      // pastille n'est résolue — c'est cette même absence qui SERAIT observée dans `extra`
      // si le branchement F3 était retiré de `App.tsx` (le contrefactuel de ce CA).
      const badgeSansPastille = identityPreamble({
        persona: "Boromir",
        royaume: "ROBOTIMMO",
      });
      expect(badgeSansPastille).not.toContain("🟠 [ROBOTIMMO][Boromir]");
      // Le nom+royaume SEULS, eux, y sont déjà — c'est précisément ce qui rendrait un test
      // sans verrou vert à tort.
      expect(badgeSansPastille).toContain("[ROBOTIMMO][Boromir]");

      render(<App />);
      await flushMicrotasks(8);

      const putBtn = await screen.findByRole("button", {
        name: "↗ Poser sur la table",
      });
      fireEvent.click(putBtn);

      await waitFor(() => {
        expect(runnerOpenCalls.length).toBeGreaterThan(0);
      });

      // CA-8 — la pastille est présente dans le PREMIER appel, jamais un appel ultérieur
      // (le spawn ne rejoue pas : § 2.7 de l'instruction).
      const args = runnerOpenCalls[0];
      const extra = String(args.systemPromptExtra ?? "");

      // --- L'ASSERTION QUI COMPTE ------------------------------------------------------
      // Boromir porte `royaume:"coordination"` dans FELLOWSHIP_TEAM (§ haut de fichier) →
      // `phasePastilleFor("coordination", 1)` = 🟠. Chaîne EXACTE, ouverture ET clôture.
      expect(extra).toContain("🟠 [ROBOTIMMO][Boromir]");
      expect(extra).toContain("[ROBOTIMMO][Boromir] 🟠");
    },
  );
});
