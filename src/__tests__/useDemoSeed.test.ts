import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDemoSeed } from "../hooks/useDemoSeed";
import { DEMO_TEAM } from "../mock/demoTeam";
import type { Backend, SeedReport } from "../api/backend";

const SEEDED: SeedReport = {
  seeded: true,
  demo_path: "/home/u/work/iaka-demo",
  created_dir: true,
  config_keys_set: ["litellm_endpoint"],
};

const INERT: SeedReport = {
  seeded: false,
  demo_path: null,
  created_dir: false,
  config_keys_set: [],
};

function makeApi(report: SeedReport | (() => Promise<SeedReport>)): Backend {
  const impl = typeof report === "function" ? report : async () => report;
  return { seedDemo: vi.fn(impl) } as unknown as Backend;
}

/** Mock typé d'`openTab` (signature `(projectId, title, cwd) => id`). */
function makeOpenTab() {
  return vi.fn<(projectId: string, title: string, cwd: string) => string>(
    () => "tab-id",
  );
}

describe("useDemoSeed — bootstrap démo (L7)", () => {
  it("seeded:true + tabs vides → ouvre les 5 onglets team + refresh portfolio", async () => {
    const api = makeApi(SEEDED);
    const openTab = makeOpenTab();
    const refreshPortfolio = vi.fn(async () => {});

    renderHook(() =>
      useDemoSeed({ api, tabsCount: 0, openTab, refreshPortfolio }),
    );

    await waitFor(() => expect(openTab).toHaveBeenCalledTimes(DEMO_TEAM.length));
    // Les onglets pointent sur le dossier démo et portent un titre [ROYAUME][Agent].
    for (let i = 0; i < DEMO_TEAM.length; i++) {
      const args = openTab.mock.calls[i];
      expect(args[1]).toBe(`[${DEMO_TEAM[i].royaume}][${DEMO_TEAM[i].agent}]`);
      expect(args[2]).toBe("/home/u/work/iaka-demo");
    }
    await waitFor(() => expect(refreshPortfolio).toHaveBeenCalled());
  });

  it("seeded:false (flag off / prod) → n'ouvre AUCUN onglet, ne refresh pas", async () => {
    const api = makeApi(INERT);
    const openTab = makeOpenTab();
    const refreshPortfolio = vi.fn(async () => {});

    renderHook(() =>
      useDemoSeed({ api, tabsCount: 0, openTab, refreshPortfolio }),
    );

    await waitFor(() => expect(api.seedDemo).toHaveBeenCalled());
    await Promise.resolve();
    expect(openTab).not.toHaveBeenCalled();
    expect(refreshPortfolio).not.toHaveBeenCalled();
  });

  it("seeded:true mais tabs déjà ouverts (>0) → n'ouvre PAS d'onglet (non-doublon)", async () => {
    const api = makeApi(SEEDED);
    const openTab = makeOpenTab();
    const refreshPortfolio = vi.fn(async () => {});

    renderHook(() =>
      useDemoSeed({ api, tabsCount: 3, openTab, refreshPortfolio }),
    );

    await waitFor(() => expect(api.seedDemo).toHaveBeenCalled());
    await waitFor(() => expect(refreshPortfolio).toHaveBeenCalled());
    // Onglets déjà présents → on ne redouble pas, mais on rafraîchit la tuile.
    expect(openTab).not.toHaveBeenCalled();
  });

  it("exécution unique par session : un re-render ne ré-appelle pas seedDemo", async () => {
    const api = makeApi(SEEDED);
    const openTab = makeOpenTab();
    const refreshPortfolio = vi.fn(async () => {});

    const { rerender } = renderHook(
      (props: { tabsCount: number }) =>
        useDemoSeed({
          api,
          tabsCount: props.tabsCount,
          openTab,
          refreshPortfolio,
        }),
      { initialProps: { tabsCount: 0 } },
    );

    await waitFor(() => expect(api.seedDemo).toHaveBeenCalledTimes(1));
    rerender({ tabsCount: 5 });
    rerender({ tabsCount: 5 });
    // Toujours un seul appel : le useRef garde l'exécution unique.
    expect(api.seedDemo).toHaveBeenCalledTimes(1);
  });

  it("seedDemo rejette (hors Tauri) → no-op silencieux, pas de crash", async () => {
    const api = makeApi(async () => {
      throw new Error("not in tauri");
    });
    const openTab = makeOpenTab();
    const refreshPortfolio = vi.fn(async () => {});

    renderHook(() =>
      useDemoSeed({ api, tabsCount: 0, openTab, refreshPortfolio }),
    );

    await waitFor(() => expect(api.seedDemo).toHaveBeenCalled());
    await Promise.resolve();
    expect(openTab).not.toHaveBeenCalled();
    expect(refreshPortfolio).not.toHaveBeenCalled();
  });
});
