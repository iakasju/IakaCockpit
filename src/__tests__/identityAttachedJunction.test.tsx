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
 *
 * --- Lot « Statut vivant et session attachée » (2026-09-05) --------------------------------
 * S-1 (gate 🏹 Legolas de L46) : un geste RÉEL d'une conversation `attached` allumait le point
 * de statut « travaille » du COORDINATEUR de la team liée dans le roster (`useLiveStatus.ts`),
 * et les bulles assistant (`Chat.tsx`) portaient son nom + sa vignette — deux canaux distincts
 * de la MÊME fabrication que celle réparée ci-dessus pour `.evagent`/le bandeau des
 * délégations. CA-2/CA-3/CA-4/CA-9 vivent dans CE fichier (calque `identityJunction.test.tsx`,
 * AR-6).
 *
 * PIÈGE D'HORLOGE (§ 2.8 de l'instruction) : `useNow` ne pousse `Date.now()` qu'à intervalle
 * de 1 000 ms (+ tick immédiat au montage/retour de visibilité). Un event marqué APRÈS le
 * montage est donc invisible tant qu'aucun tick n'a eu lieu (`now` figé < `lastEventTs` →
 * `deriveLiveStatus` rend `idle` par la branche défensive). AUCUN sleep réel, AUCUN faux
 * timer vitest (`waitFor`/`@testing-library/dom` ne détectent PAS les faux timers de vitest,
 * cf. § 2.8 (1) de l'instruction — la détection est gardée par `typeof jest !== 'undefined'`,
 * absent sous vitest) : `forceNowTick()` force un tick DÉTERMINISTE via deux
 * `visibilitychange` (masqué puis visible), idiome DÉJÀ testé dans `useNow.test.ts`. Ce
 * couplage à `useNow` est assumé : si `useNow` cesse de ticker au retour de visibilité, ces
 * tests deviennent vacuous — d'où le VERROU positif de CA-3 (un cas `owned` qui, avec le
 * MÊME tick, doit afficher « travaille »).
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

/**
 * Calque `identityJunction.test.tsx` (`latest_transcript` → `null` ⇒ ouverture `owned`,
 * PAS `attached`) — le VERROU positif de CA-3/CA-9 : le MÊME harnais doit pouvoir produire
 * un statut « travaille » et un `.bwho` quand le Cockpit possède RÉELLEMENT le runner.
 */
function makeOwnedInvokeMock(): {
  invoke: InvokeFn;
  runnerOpenCalls: Record<string, unknown>[];
} {
  const runnerOpenCalls: Record<string, unknown>[] = [];
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
        return Promise.resolve(null); // pas de session vivante → ouverture `owned`
      case "pty_runner_open":
        runnerOpenCalls.push(args ?? {});
        return Promise.resolve({
          session_id: "sid-1",
          transcript_path: "/tmp/sid-1.jsonl",
          started_at_ms: 0,
        });
      case "transcript_tail_start":
        return Promise.resolve();
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

/**
 * Tick DÉTERMINISTE de `useNow` (§ 2.8 (2) de l'instruction) : force le hook à recalculer
 * `now = Date.now()` SANS attente réelle ni faux timer. `useNow.ts` appelle `tick()`
 * immédiatement à chaque `start()` (montage ET retour de visibilité) — deux
 * `visibilitychange` (masqué puis visible) suffisent, et le second a lieu APRÈS l'événement
 * marqué par le test, garantissant `dt = now - lastEventTs ≥ 0`. Idiome déjà éprouvé dans
 * `src/__tests__/useNow.test.ts`.
 */
async function forceNowTick(): Promise<void> {
  await act(async () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
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

/** Cherche l'item roster (`.rosteritem`) portant `name` dans son texte. */
function findRosterItem(name: string): Element | undefined {
  const rosterEl = document.querySelector(".roster");
  return Array.from(rosterEl?.querySelectorAll(".rosteritem") ?? []).find((el) =>
    el.textContent?.includes(name),
  );
}

describe(
  "Statut vivant et session attachée (lot 2026-09-05) — CA-2/CA-4/CA-7 : un geste " +
    "ATTACHÉ n'allume AUCUN agent du roster, sans casser le signal honnête",
  () => {
    it(
      "CA-2 — après un tick déterministe, le coordinateur de la team liée reste " +
        "« non lancé » et AUCUNE ligne du roster ne porte « travaille » ; " +
        "CA-4 — le point d'onglet reste `running` et le badge attaché reste affiché ; " +
        "CA-7 — aucune réouverture répétée (un seul démarrage de tailer)",
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
        await waitFor(() => expect(tailStartCalls.length).toBeGreaterThan(0));

        await act(async () => {
          emitTauriEvent("runner://event/ext-session-1", {
            kind: "geste",
            role: "assistant",
            is_sidechain: false,
            tool_name: "Bash",
            tool_input: "git status",
          });
        });
        await waitFor(() => {
          screen.getByText(/git status/);
        });

        // Piège d'horloge (§ 2.8) : SANS ce tick déterministe, l'assertion « idle/none »
        // serait satisfaite trivialement (le tick n'a jamais eu lieu) — c'est précisément
        // ce que le VERROU positif de CA-3 (describe suivant) existe pour attraper.
        await forceNowTick();

        // --- CA-2 : LE CA QUI COMPTE ---------------------------------------------------
        const boromirItem = findRosterItem("Boromir");
        expect(boromirItem).toBeTruthy();
        expect(
          boromirItem?.querySelector(".rstatus")?.classList.contains("none"),
        ).toBe(true);
        expect(boromirItem?.querySelector(".rstate")?.textContent).toBe("non lancé");
        expect(document.querySelectorAll(".rstatus.working").length).toBe(0);
        expect(screen.queryAllByText("travaille").length).toBe(0);

        // --- CA-4 : on n'a PAS réparé en supprimant une information vraie --------------
        expect(document.querySelector(".pt-status.running")).not.toBeNull();
        expect(screen.getByText("session vivante · lecture seule")).toBeTruthy();

        // --- CA-7 : l'ouverture eager L24-F1 n'a pas rouvert la conversation attachée ---
        // en boucle (un seul démarrage de tailer malgré le tick + le geste + les
        // multiples re-renders).
        expect(tailStartCalls.length).toBe(1);
      },
    );
  },
);

describe(
  "Statut vivant et session attachée (lot 2026-09-05) — CA-3, LE VERROU " +
    "(anti-témoin-vide) : le harnais peut produire un « travaille »",
  () => {
    it(
      "le MÊME geste et la MÊME procédure de tick, en mode OWNED, affichent bien " +
        "« travaille » pour le coordinateur",
      async () => {
        const { invoke, runnerOpenCalls } = makeOwnedInvokeMock();
        currentInvoke = invoke;

        const { default: App } = await import("../App");
        render(<App />);
        await flushMicrotasks(8);

        const putBtn = await screen.findByRole("button", {
          name: "↗ Poser sur la table",
        });
        fireEvent.click(putBtn);

        await waitFor(() => expect(runnerOpenCalls.length).toBeGreaterThan(0));
        // Laisse le temps à `usePty`/`useRunnerViews` de brancher le listener sur le
        // `sid` renvoyé par `pty_runner_open` avant d'émettre l'event.
        await flushMicrotasks(6);

        await act(async () => {
          emitTauriEvent("runner://event/sid-1", {
            kind: "geste",
            role: "assistant",
            is_sidechain: false,
            tool_name: "Bash",
            tool_input: "git status",
          });
        });
        await waitFor(() => {
          screen.getByText(/git status/);
        });

        await forceNowTick();

        const boromirItem = findRosterItem("Boromir");
        expect(boromirItem).toBeTruthy();
        expect(
          boromirItem?.querySelector(".rstatus")?.classList.contains("working"),
        ).toBe(true);
        expect(boromirItem?.querySelector(".rstate")?.textContent).toBe("travaille");
      },
    );
  },
);

describe(
  "Statut vivant et session attachée (lot 2026-09-05) — CA-9 : la parole ATTACHÉE ne " +
    "porte aucun nom d'emprunt (verrou positif inclus)",
  () => {
    it("un tour `parole` assistant d'une session ATTACHÉE ne porte ni nom ni avatar", async () => {
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
      await waitFor(() => expect(tailStartCalls.length).toBeGreaterThan(0));

      await act(async () => {
        emitTauriEvent("runner://event/ext-session-1", {
          kind: "parole",
          role: "assistant",
          is_sidechain: false,
          text: "Bonjour depuis la session externe",
        });
      });
      await screen.findByText("Bonjour depuis la session externe");

      // --- L'ASSERTION QUI COMPTE : aucun repli sur la persona de la conversation -----
      expect(document.querySelector(".bwho")).toBeNull();
      expect(document.querySelector(".bavatar")).toBeNull();
    });

    it(
      "VERROU — le MÊME tour `parole`, en mode OWNED, affiche bien le nom du " +
        "coordinateur (`.bwho`)",
      async () => {
        const { invoke, runnerOpenCalls } = makeOwnedInvokeMock();
        currentInvoke = invoke;

        const { default: App } = await import("../App");
        render(<App />);
        await flushMicrotasks(8);

        const putBtn = await screen.findByRole("button", {
          name: "↗ Poser sur la table",
        });
        fireEvent.click(putBtn);
        await waitFor(() => expect(runnerOpenCalls.length).toBeGreaterThan(0));
        await flushMicrotasks(6);

        await act(async () => {
          emitTauriEvent("runner://event/sid-1", {
            kind: "parole",
            role: "assistant",
            is_sidechain: false,
            text: "Bonjour depuis le runner du cockpit",
          });
        });
        await screen.findByText("Bonjour depuis le runner du cockpit");

        const bwho = document.querySelector(".bwho");
        expect(bwho).not.toBeNull();
        expect(bwho?.textContent).toBe("Boromir");
      },
    );
  },
);

describe(
  "Statut vivant et session attachée (lot 2026-09-05) — CA-6 : la bascule " +
    "attached → owned ne récupère PAS la fraîcheur héritée de la session externe",
  () => {
    it(
      "après un geste attaché puis « démarrer un runner », le coordinateur ne porte PAS " +
        "« travaille » tant que le runner neuf n'a rien émis",
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
        await waitFor(() => expect(tailStartCalls.length).toBeGreaterThan(0));

        // Le geste attaché marque la fraîcheur SOUS L'ID RÉEL DU PROJET (§ 2.1 étape 3
        // de l'instruction) — c'est ce résidu que la bascule doit purger (§ 2.7).
        await act(async () => {
          emitTauriEvent("runner://event/ext-session-1", {
            kind: "geste",
            role: "assistant",
            is_sidechain: false,
            tool_name: "Bash",
            tool_input: "git status",
          });
        });
        await waitFor(() => {
          screen.getByText(/git status/);
        });

        // « Démarrer un runner du cockpit » — bascule attached → owned (F4/AR-4).
        const startBtn = await screen.findByRole("button", {
          name: "Démarrer un runner du cockpit",
        });
        fireEvent.click(startBtn);
        await flushMicrotasks(6);

        await forceNowTick();

        // Le slot est désormais POSSÉDÉ (source owned) → le repli n'est plus `none`,
        // mais AUCUN event du runner neuf n'est encore arrivé → `idle`, jamais
        // `travaille` sur la foi de l'ancien geste externe.
        const boromirItem = findRosterItem("Boromir");
        expect(boromirItem).toBeTruthy();
        expect(boromirItem?.querySelector(".rstate")?.textContent).not.toBe("travaille");
        expect(
          boromirItem?.querySelector(".rstatus")?.classList.contains("working"),
        ).toBe(false);
      },
    );
  },
);
