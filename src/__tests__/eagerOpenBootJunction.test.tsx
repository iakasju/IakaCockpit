/**
 * Jonction workset ↔ portfolio au BOOT (L37-CA6, correctif). Deux sources
 * asynchrones concourent au démarrage — `useWorkset` (lecture `config_get`,
 * rapide) et `usePortfolio` (`get_root` puis `scan_portfolio`, parcours disque,
 * plus lent) — et `decideEagerOpenFocus` (App.tsx) ne regardait QUE la première.
 *
 * DÉFAUT REPRODUIT ICI (recette réelle du décideur, 2026-09-04) : quand
 * `config_get("workset")` répond AVANT `scan_portfolio`, la fenêtre de
 * restauration est consommée alors que `worksetProjects` est encore VIDE
 * (l'intersection portfolio ⨯ workset n'a rien à ouvrir) ; quand le scan
 * arrive enfin et peuple la Table, la fenêtre est déjà refermée → `focus=true`
 * → la navigation est volée, l'app s'ouvre sur Travail au lieu de Portefeuille.
 *
 * Comme `updateJunction.test.tsx` (L34, réserve « jonction C4 ») : ni
 * `reconcileEagerOpen.test.ts` (fonction pure, ne voit pas la rencontre des
 * deux hooks) ni un test de hook isolé ne traversent ce câblage — seul le
 * montage de l'App RÉELLE le fait. Plugins Tauri mockés, AUCUN accès réseau.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import type { Project } from "../api/backend";

// Mock PtyTerminal (xterm lourd / jsdom — `matchMedia` absent) : calque
// `WorkingView.test.tsx`. Ce lot navigue réellement vers Travail (test de
// non-régression L24), qui monterait le vrai xterm sinon.
vi.mock("../components/PtyTerminal", () => ({
  PtyTerminal: () => <div data-testid="pty" />,
}));

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
    id: "demo",
    path: "/work/demo",
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

type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

/**
 * Deferred contrôlé : `scan_portfolio` ne répond que quand le test le décide,
 * pour forcer l'ordre `config_get` (workset) AVANT `scan_portfolio` (portfolio) —
 * exactement le déroulé mesuré en recette réelle.
 */
function makeInvokeMock(): {
  invoke: InvokeFn;
  resolveScan: (projects: Project[]) => void;
} {
  let resolveScan!: (projects: Project[]) => void;
  const scanPromise = new Promise<Project[]>((resolve) => {
    resolveScan = resolve;
  });

  const invoke = vi.fn((cmd: string, args?: Record<string, unknown>) => {
    switch (cmd) {
      case "get_root":
        return Promise.resolve("/work");
      case "config_get":
        // `useWorkset` restaure "demo" ; toute autre clé → absente (null).
        return Promise.resolve(
          args?.key === "workset" ? JSON.stringify(["demo"]) : null,
        );
      case "config_all":
        // Le projet "demo" est déjà LIÉ à une team → éligible à l'ouverture eager.
        return Promise.resolve({ "project_team:demo": "iakaframe" });
      case "config_set":
        return Promise.resolve();
      case "scan_portfolio":
        return scanPromise; // délibérément en attente — résolu par le test
      case "list_extra_projects":
        return Promise.resolve([]);
      case "latest_transcript":
        return Promise.resolve(null);
      default:
        return new Promise(() => {}); // pending forever, calque App.nav.test.tsx
    }
  });

  return { invoke, resolveScan };
}

let currentInvoke: InvokeFn;
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => currentInvoke(cmd, args),
}));

async function flushMicrotasks(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    // Flush séquentiel voulu (pas parallèle) : chaque tour laisse React committer.
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

describe("App — jonction workset↔portfolio au boot (L37-CA6)", () => {
  it(
    "config_get (workset) répond AVANT scan_portfolio : la Table se repeuple, " +
      "la vue reste Portefeuille (AR-1 = (c), pas de vol de focus au boot)",
    async () => {
      const { invoke, resolveScan } = makeInvokeMock();
      currentInvoke = invoke;

      const { default: App } = await import("../App");
      render(<App />);

      // Laisse `config_get("workset")` (rapide) répondre PENDANT que
      // `scan_portfolio` (lent, contrôlé) reste en attente : reproduit l'ordre
      // mesuré en recette réelle sans dépendre d'un minutage fragile.
      await flushMicrotasks(6);

      // Le scan arrive ENFIN et peuple le portefeuille — la Table doit se
      // repeupler (intersection portfolio ⨯ workset non vide).
      resolveScan([project()]);

      await waitFor(() => {
        expect(screen.getByText("/work/demo")).toBeTruthy();
      });

      // La navigation ne doit PAS avoir été volée : le bouton « Table »
      // (Travail, aria-label explicite) ne porte pas `aria-current="page"`,
      // le bouton « Étagère » (Portefeuille) si.
      const travailBtn = screen.getByRole("button", { name: "Table" });
      expect(travailBtn.getAttribute("aria-current")).not.toBe("page");
      const portefeuilleBtn = screen.getByRole("button", { name: "Étagère" });
      expect(portefeuilleBtn.getAttribute("aria-current")).toBe("page");
    },
  );

  it(
    "une pose utilisateur APRÈS le boot vole bien le focus (non-régression L24)",
    async () => {
      // Boot : workset restauré VIDE (rien à ouvrir) ; portfolio arrive avec un
      // projet NON posé sur la table — le boot doit se terminer sans naviguer.
      currentInvoke = (cmd: string, args?: Record<string, unknown>) => {
        switch (cmd) {
          case "get_root":
            return Promise.resolve("/work");
          case "config_get":
            return Promise.resolve(args?.key === "workset" ? "[]" : null);
          case "config_all":
            return Promise.resolve({ "project_team:demo": "iakaframe" });
          case "config_set":
            return Promise.resolve();
          case "scan_portfolio":
            return Promise.resolve([project()]);
          case "list_extra_projects":
            return Promise.resolve([]);
          case "latest_transcript":
            return Promise.resolve(null);
          default:
            return new Promise(() => {});
        }
      };

      const { default: App } = await import("../App");
      render(<App />);
      await flushMicrotasks(6);

      // Le projet apparaît dans l'Atelier (hors table) — geste utilisateur : le
      // poser sur la table via le bouton de la ligne « Atelier ».
      const putBtn = await screen.findByRole("button", {
        name: "↗ Poser sur la table",
      });
      fireEvent.click(putBtn);

      // Cette fois la navigation DOIT avoir lieu (comportement L24 inchangé) :
      // le bouton « Table » (Travail) devient la page courante.
      await waitFor(() => {
        const travailBtn = screen.getByRole("button", { name: "Table" });
        expect(travailBtn.getAttribute("aria-current")).toBe("page");
      });
    },
  );
});
