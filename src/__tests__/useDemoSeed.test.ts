import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDemoSeed, DEMO_PROJECT_ID } from "../hooks/useDemoSeed";
import { DEMO_HISTORY } from "../mock/demoConversation";
import type { Backend, SeedReport } from "../api/backend";
import type { ChatTurn } from "../hooks/useConversations";

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

/** Mock typé d'`openConversation` (signature L9 : `(projectId, title, cwd, agent?, initialHistory?) => id`). */
function makeOpenConv() {
  return vi.fn<
    (
      projectId: string,
      title: string,
      cwd: string,
      agent?: string,
      initialHistory?: ChatTurn[],
    ) => string
  >(() => "conv-id");
}

describe("useDemoSeed — bootstrap démo (L7 réconcilié L8/D7)", () => {
  it("seeded:true + aucune conversation → ouvre UNE conversation démo + refresh + précharge l'historique (C.1)", async () => {
    const api = makeApi(SEEDED);
    const openConversation = makeOpenConv();
    const refreshPortfolio = vi.fn(async () => {});
    const addToWorkset = vi.fn();

    renderHook(() =>
      useDemoSeed({
        api,
        conversationsCount: 0,
        openConversation,
        refreshPortfolio,
        addToWorkset,
      }),
    );

    // L8/D7 : UNE seule conversation (plus 5 onglets).
    await waitFor(() => expect(openConversation).toHaveBeenCalledTimes(1));
    const args = openConversation.mock.calls[0];
    expect(args[0]).toBe(DEMO_PROJECT_ID);
    expect(args[1]).toBe(DEMO_PROJECT_ID);
    expect(args[2]).toBe("/home/u/work/iaka-demo");
    // L9-C.1 : l'historique de démo est passé en 5e argument (chaîne de badges).
    expect(args[4]).toEqual(DEMO_HISTORY);
    await waitFor(() => expect(refreshPortfolio).toHaveBeenCalled());
  });

  it("L9-B : seeded:true → ajoute iaka-demo au set de Work (idempotent côté add)", async () => {
    const api = makeApi(SEEDED);
    const openConversation = makeOpenConv();
    const refreshPortfolio = vi.fn(async () => {});
    const addToWorkset = vi.fn();

    renderHook(() =>
      useDemoSeed({
        api,
        conversationsCount: 0,
        openConversation,
        refreshPortfolio,
        addToWorkset,
      }),
    );

    await waitFor(() =>
      expect(addToWorkset).toHaveBeenCalledWith(DEMO_PROJECT_ID),
    );
    expect(addToWorkset).toHaveBeenCalledTimes(1);
  });

  it("L9-B : seeded:false (prod) → n'ajoute RIEN au set de Work", async () => {
    const api = makeApi(INERT);
    const openConversation = makeOpenConv();
    const refreshPortfolio = vi.fn(async () => {});
    const addToWorkset = vi.fn();

    renderHook(() =>
      useDemoSeed({
        api,
        conversationsCount: 0,
        openConversation,
        refreshPortfolio,
        addToWorkset,
      }),
    );

    await waitFor(() => expect(api.seedDemo).toHaveBeenCalled());
    await Promise.resolve();
    expect(addToWorkset).not.toHaveBeenCalled();
  });

  it("L9-B : même conversation déjà active → ajoute QUAND MÊME au set de Work (B indépendant de C)", async () => {
    const api = makeApi(SEEDED);
    const openConversation = makeOpenConv();
    const refreshPortfolio = vi.fn(async () => {});
    const addToWorkset = vi.fn();

    renderHook(() =>
      useDemoSeed({
        api,
        conversationsCount: 1,
        openConversation,
        refreshPortfolio,
        addToWorkset,
      }),
    );

    await waitFor(() =>
      expect(addToWorkset).toHaveBeenCalledWith(DEMO_PROJECT_ID),
    );
    // La conversation n'est pas redoublée, mais le workset est bien alimenté.
    expect(openConversation).not.toHaveBeenCalled();
  });

  it("seeded:false (flag off / prod) → n'ouvre AUCUNE conversation, ne refresh pas", async () => {
    const api = makeApi(INERT);
    const openConversation = makeOpenConv();
    const refreshPortfolio = vi.fn(async () => {});

    renderHook(() =>
      useDemoSeed({
        api,
        conversationsCount: 0,
        openConversation,
        refreshPortfolio,
      }),
    );

    await waitFor(() => expect(api.seedDemo).toHaveBeenCalled());
    await Promise.resolve();
    expect(openConversation).not.toHaveBeenCalled();
    expect(refreshPortfolio).not.toHaveBeenCalled();
  });

  it("seeded:true mais une conversation déjà active (>0) → n'ouvre PAS (non-doublon)", async () => {
    const api = makeApi(SEEDED);
    const openConversation = makeOpenConv();
    const refreshPortfolio = vi.fn(async () => {});

    renderHook(() =>
      useDemoSeed({
        api,
        conversationsCount: 1,
        openConversation,
        refreshPortfolio,
      }),
    );

    await waitFor(() => expect(api.seedDemo).toHaveBeenCalled());
    await waitFor(() => expect(refreshPortfolio).toHaveBeenCalled());
    // Conversation déjà présente → on ne redouble pas, mais on rafraîchit la tuile.
    expect(openConversation).not.toHaveBeenCalled();
  });

  it("exécution unique par session : un re-render ne ré-appelle pas seedDemo", async () => {
    const api = makeApi(SEEDED);
    const openConversation = makeOpenConv();
    const refreshPortfolio = vi.fn(async () => {});

    const { rerender } = renderHook(
      (props: { conversationsCount: number }) =>
        useDemoSeed({
          api,
          conversationsCount: props.conversationsCount,
          openConversation,
          refreshPortfolio,
        }),
      { initialProps: { conversationsCount: 0 } },
    );

    await waitFor(() => expect(api.seedDemo).toHaveBeenCalledTimes(1));
    rerender({ conversationsCount: 1 });
    rerender({ conversationsCount: 1 });
    // Toujours un seul appel : le useRef garde l'exécution unique.
    expect(api.seedDemo).toHaveBeenCalledTimes(1);
  });

  it("seedDemo rejette (hors Tauri) → no-op silencieux, pas de crash", async () => {
    const api = makeApi(async () => {
      throw new Error("not in tauri");
    });
    const openConversation = makeOpenConv();
    const refreshPortfolio = vi.fn(async () => {});

    renderHook(() =>
      useDemoSeed({
        api,
        conversationsCount: 0,
        openConversation,
        refreshPortfolio,
      }),
    );

    await waitFor(() => expect(api.seedDemo).toHaveBeenCalled());
    await Promise.resolve();
    expect(openConversation).not.toHaveBeenCalled();
    expect(refreshPortfolio).not.toHaveBeenCalled();
  });
});
