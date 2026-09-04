/**
 * Identité du runner — correctif de FAIL (gate 🏹 Legolas, 2026-09-04).
 *
 * Défaut rendu VERBATIM par le gate : « `src/App.tsx:177-180` (`identityFor`) et
 * `src/hooks/useRunnerViews.ts:142` — l'attribution F2 ne tient pas compte de
 * `conv.source`. Une conversation `attached` (L25) sur un projet lié à une team voit ses
 * tours `geste`/`activite`/`pensee`, émis par un transcript EXTERNE que le Cockpit n'a
 * jamais informé de rien, attribués au coordinateur de la team liée. Violation directe de
 * CA-6 (« conversation `attached` → … et aucune attribution de geste ») et du repli
 * explicite § 6 F1 de l'instruction (« … ou `source:"attached"` → `""` »). »
 *
 * Ce fichier REPRODUIT ce défaut à la JONCTION exacte où il vit — pas dans une fonction
 * pure (`resolveRunnerIdentity` ne sait même pas ce qu'est une conversation ATTACHÉE :
 * elle décide uniquement à partir de `hasBinding`/`persona`/`projectId`/`runnerKind`,
 * cf. `src/frame/identity.ts`). Calque `identityJunction.test.tsx` (CA-2) : monte l'App
 * RÉELLE, mais force ici le chemin `attached` — `latest_transcript` renvoie une session
 * EXTERNE déjà vivante — puis simule un `RunnerEvent` de kind `geste` émis par CETTE
 * session, et vérifie qu'AUCUN nom d'agent n'atteint le DOM.
 *
 * xterm est stubbé (canvas/mesure absents en jsdom, calque `termFontSize.test.tsx`) mais
 * `PtyTerminal` N'EST PAS mocké — inutile ici : une conversation `attached` ne monte de
 * toute façon AUCUN `PtyTerminal` (L25, garde vérifiée en negatif par `runnerOpenCalls`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
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

// --- Bus d'événements Tauri MINIMAL, keyé par nom d'event (calque `chatE2E.harness`,
// nécessaire ICI car on doit ÉMETTRE nous-mêmes le `runner://event/<sid>` du transcript
// externe — un `listen` qui ne fait qu'avaler l'abonnement, comme dans `identityJunction`,
// ne permettrait pas de déclencher l'event). ---
type TauriCb = (e: { payload: unknown }) => void;
const eventBus = new Map<string, Set<TauriCb>>();
function emitTauriEvent(name: string, payload: unknown): void {
  eventBus.get(name)?.forEach((cb) => cb({ payload }));
}
vi.mock("@tauri-apps/api/event", () => ({
  listen: (name: string, cb: TauriCb) => {
    let set = eventBus.get(name);
    if (!set) {
      set = new Set();
      eventBus.set(name, set);
    }
    set.add(cb);
    return Promise.resolve(() => {
      eventBus.get(name)?.delete(cb);
    });
  },
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

/** Team custom liée au projet — coordinateur "Boromir" (calque `identityJunction.test.tsx`) :
 * si le nom "Boromir" apparaît quelque part sur un tour de geste, c'est FORCÉMENT une
 * fabrication de ce lot, pas un résidu d'une table de secours codée en dur. */
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
  tailStartCalls: Record<string, unknown>[];
} {
  const runnerOpenCalls: Record<string, unknown>[] = [];
  const tailStartCalls: Record<string, unknown>[] = [];
  const invoke = vi.fn((cmd: string, args?: Record<string, unknown>) => {
    switch (cmd) {
      case "get_root":
        return Promise.resolve("/work");
      case "config_get":
        return Promise.resolve(args?.key === "workset" ? "[]" : null);
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
        // L25 — FORCE le mode ATTACHED : une session EXTERNE est déjà vivante sur le cwd
        // du projet. C'est précisément le cas que Legolas a reproduit : « ouvrir un
        // projet lié à une team dont une session Claude Code externe est déjà vivante ».
        return Promise.resolve({
          session_id: "ext-session-1",
          path: "/tmp/ext-session-1.jsonl",
          mtime_epoch: 0,
        });
      case "pty_runner_open":
        // Ne doit JAMAIS être appelé pour une conversation attachée (garde L25).
        runnerOpenCalls.push(args ?? {});
        return Promise.resolve({
          session_id: "sid-1",
          transcript_path: "/tmp/sid-1.jsonl",
          started_at_ms: 0,
        });
      case "transcript_tail_start":
        tailStartCalls.push(args ?? {});
        return Promise.resolve();
      default:
        return new Promise(() => {}); // en attente (frame_load, seed_demo…) — inoffensif
    }
  });
  return { invoke, runnerOpenCalls, tailStartCalls };
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
  eventBus.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe(
  "Identité du runner — correctif FAIL (une conversation ATTACHÉE n'attribue jamais " +
    "le coordinateur de la team liée)",
  () => {
    it(
      "un geste émis par le transcript d'une session EXTERNE (attached) sur un projet " +
        "lié à une team n'affiche AUCUN nom d'agent (ni le coordinateur de la team)",
      async () => {
        const { invoke, runnerOpenCalls, tailStartCalls } = makeInvokeMock();
        currentInvoke = invoke;

        const { default: App } = await import("../App");
        render(<App />);
        await flushMicrotasks(8);

        // Geste utilisateur : poser le projet lié sur la table (calque CA-2).
        const putBtn = await screen.findByRole("button", {
          name: "↗ Poser sur la table",
        });
        fireEvent.click(putBtn);

        // La conversation doit s'ouvrir en mode ATTACHÉ (badge « session vivante »),
        // et ne JAMAIS spawner de PTY — c'est le contrat L25 (garde de non-régression,
        // vérifiée ici EN NÉGATIF avant même d'observer l'attribution).
        await screen.findByText("session vivante · lecture seule");
        expect(runnerOpenCalls.length).toBe(0);

        // Le tailer démarre bel et bien sur le transcript EXTERNE (clef = session attachée).
        await waitFor(() => expect(tailStartCalls.length).toBeGreaterThan(0));
        expect(tailStartCalls[0]?.sessionId).toBe("ext-session-1");

        // On simule le transcript EXTERNE qui émet un geste (Bash) — exactement ce que
        // produirait un runner que ce Cockpit n'a JAMAIS informé de rien.
        await act(async () => {
          emitTauriEvent("runner://event/ext-session-1", {
            kind: "geste",
            role: "assistant",
            is_sidechain: false,
            tool_name: "Bash",
            tool_input: "git status",
          });
        });

        // Le geste doit apparaître dans le fil (le tailer fonctionne) — `getByText` lève
        // si l'élément est absent, ce qui suffit comme assertion (pas de jest-dom ici).
        await waitFor(() => {
          screen.getByText(/git status/);
        });

        // …mais SANS attribution : ni la classe `.evagent` (Chat.tsx ne la rend QUE si
        // `turn.agent` est défini), ni le nom du coordinateur de la team liée dans LA
        // LIGNE D'ÉVÉNEMENT elle-même. C'EST LE CŒUR DU CRITÈRE (CA-6, § 6 F1 :
        // `source:"attached"` → ""). "Boromir" apparaît légitimement AILLEURS à l'écran
        // (interlocuteur `.ct-agent`, roster) : ce n'est PAS ce que ce test vérifie —
        // il vérifie que la ligne de GESTE, elle, ne porte aucun nom.
        expect(document.querySelector(".evagent")).toBeNull();
        const evline = document.querySelector(".ev-geste");
        expect(evline).not.toBeNull();
        expect(evline?.textContent ?? "").not.toContain("Boromir");
      },
    );

    it(
      "JUMEAU (trouvé en cherchant les jumeaux du défaut, § tâche 4) — une vraie " +
        "délégation portée par une session ATTACHÉE ne fait PAS apparaître le " +
        "coordinateur de la team liée comme racine de l'arbre des délégations",
      async () => {
        const { invoke, tailStartCalls } = makeInvokeMock();
        currentInvoke = invoke;

        const { default: App } = await import("../App");
        render(<App />);
        await flushMicrotasks(8);

        const putBtn = await screen.findByRole("button", {
          name: "↗ Poser sur la table",
        });
        fireEvent.click(putBtn);
        await screen.findByText("session vivante · lecture seule");
        // Attend que le tailer soit bien abonné (calque le 1er test) — sinon l'event
        // émis plus bas part dans le vide (personne n'écoute encore).
        await waitFor(() => expect(tailStartCalls.length).toBeGreaterThan(0));

        // Une VRAIE délégation (subagent_type "gimli") vue par la session externe —
        // fait réel du transcript, alimente `useAgentTasks` (observateur additif,
        // branché quelle que soit la source, cf. `App.tsx` `ingestRunnerEvent`).
        await act(async () => {
          emitTauriEvent("runner://event/ext-session-1", {
            kind: "delegation",
            role: "assistant",
            is_sidechain: false,
            agent: "gimli",
            text: "corrige le défaut",
            tool_use_id: "toolu-1",
          });
        });
        // Deux vues affichent la description ("corrige le défaut" apparaît dans le
        // fil ET dans le panneau Tâches) — `getAllByText` assume ce pluriel.
        await waitFor(() => {
          expect(screen.getAllByText(/corrige le défaut/).length).toBeGreaterThan(0);
        });

        // Le bandeau « Délégations » est OUVERT par défaut (`showTree` init `true`,
        // `WorkingView.tsx:286`) — aucun clic nécessaire, juste s'assurer qu'il l'est
        // toujours (garde de non-régression du prérequis de ce test).
        const treeToggle = await screen.findByRole("button", {
          name: "Délégations",
        });
        expect(treeToggle.getAttribute("aria-pressed")).toBe("true");

        // AVANT le correctif, `activeRunner.coordinator` ("Boromir", le coordinateur
        // de la team LIÉE) s'affichait comme racine du bandeau (vue Couloirs par
        // défaut, `.swim`, ou Arbre, `.dtree`) — alors qu'aucune identité n'a jamais
        // atteint ce process externe. Le bandeau ENTIER (`.treeband`) ne doit tout
        // simplement PAS apparaître pour une conversation `attached`, quand bien même
        // la délégation, elle, est réelle : aucune des deux vues n'a de quoi nommer
        // honnêtement la racine.
        expect(document.querySelector(".treeband")).toBeNull();
        expect(document.querySelector(".dtree")).toBeNull();
        expect(document.querySelector(".swim")).toBeNull();
      },
    );
  },
);
