import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useSettings,
  applyToDom,
  parsePrefsExport,
  CONFIG_KEYS,
  DEFAULT_UI,
  DEFAULT_THEME,
  type DomTarget,
} from "../hooks/useSettings";
import type { Backend } from "../api/backend";

/** Cible DOM mockée : enregistre attributs + variables CSS. */
function makeDom(): DomTarget & {
  attrs: Record<string, string>;
  vars: Record<string, string>;
} {
  const attrs: Record<string, string> = {};
  const vars: Record<string, string> = {};
  return {
    attrs,
    vars,
    setAttribute: (n, v) => {
      attrs[n] = v;
    },
    style: {
      setProperty: (n, v) => {
        vars[n] = v;
      },
    },
  };
}

/** Façade config mockée, avec store en mémoire (persistance simulée). */
function makeApi(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  // Présence d'une clé IA simulée (jamais la valeur réelle — D4).
  let keyPresent = false;
  const api = {
    configAll: vi.fn(async () => ({ ...store })),
    getRoot: vi.fn(async () => "/root"),
    setRoot: vi.fn(async (r: string) => {
      store["root"] = r;
    }),
    configSet: vi.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
    configGet: vi.fn(async (k: string) => store[k] ?? null),
    aiHasKey: vi.fn(async () => keyPresent),
    aiSetKey: vi.fn(async (value: string) => {
      keyPresent = value.trim().length > 0;
    }),
  } as unknown as Backend;
  return { api, store };
}

describe("useSettings — persistance (PO-2 / D4-bis)", () => {
  it("applique les DÉFAUTS quand aucune clé n'est persistée", async () => {
    const { api } = makeApi();
    const dom = makeDom();
    const { result } = renderHook(() => useSettings({ api, dom }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.ui).toEqual(DEFAULT_UI);
    expect(result.current.theme).toBe(DEFAULT_THEME);
    expect(dom.attrs["data-theme"]).toBe(DEFAULT_THEME);
    expect(dom.attrs["data-shape"]).toBe("round");
    expect(dom.vars["--fscale"]).toBe("1");
  });

  it("relit les préférences persistées au montage et les applique au DOM", async () => {
    const { api } = makeApi({
      [CONFIG_KEYS.shape]: "square",
      [CONFIG_KEYS.density]: "compact",
      [CONFIG_KEYS.fontScale]: "120",
      [CONFIG_KEYS.theme]: "naonedge-light",
      [CONFIG_KEYS.litellmEndpoint]: "http://box:4000",
    });
    const dom = makeDom();
    const { result } = renderHook(() => useSettings({ api, dom }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.ui.shape).toBe("square");
    expect(result.current.ui.density).toBe("compact");
    expect(result.current.ui.fontScale).toBe(120);
    expect(result.current.theme).toBe("naonedge-light");
    expect(result.current.litellmEndpoint).toBe("http://box:4000");
    expect(dom.attrs["data-shape"]).toBe("square");
    expect(dom.vars["--fscale"]).toBe("1.2");
  });

  it("setUiPref écrit via configSet PUIS un remontage relit la valeur", async () => {
    const { api, store } = makeApi();
    const dom1 = makeDom();
    const first = renderHook(() => useSettings({ api, dom: dom1 }));
    await waitFor(() => expect(first.result.current.loaded).toBe(true));

    await act(async () => {
      await first.result.current.setUiPref("shape", "square");
    });
    // Écriture persistée
    expect(api.configSet).toHaveBeenCalledWith(CONFIG_KEYS.shape, "square");
    expect(store[CONFIG_KEYS.shape]).toBe("square");
    expect(dom1.attrs["data-shape"]).toBe("square");

    // Remontage (= redémarrage de l'app) : la valeur est retrouvée, pas le défaut.
    const dom2 = makeDom();
    const second = renderHook(() => useSettings({ api, dom: dom2 }));
    await waitFor(() => expect(second.result.current.loaded).toBe(true));
    expect(second.result.current.ui.shape).toBe("square");
    expect(dom2.attrs["data-shape"]).toBe("square");
  });

  it("setTheme persiste le thème (configSet 'theme') et l'applique", async () => {
    const { api, store } = makeApi();
    const dom = makeDom();
    const { result } = renderHook(() => useSettings({ api, dom }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.setTheme("naonedge-light");
    });
    expect(api.configSet).toHaveBeenCalledWith("theme", "naonedge-light");
    expect(store["theme"]).toBe("naonedge-light");
    expect(dom.attrs["data-theme"]).toBe("naonedge-light");
  });

  it("setLitellmEndpoint persiste l'URL (clé non sensible)", async () => {
    const { api, store } = makeApi();
    const { result } = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.setLitellmEndpoint("http://x:4000");
    });
    expect(api.configSet).toHaveBeenCalledWith("litellm_endpoint", "http://x:4000");
    expect(store["litellm_endpoint"]).toBe("http://x:4000");
  });

  it("les clés UI/theme/litellm ne matchent PAS le filtre secret (configAll)", () => {
    const isSecret = (k: string): boolean =>
      /token|key|secret|password/i.test(k);
    const keys = [
      CONFIG_KEYS.navPos,
      CONFIG_KEYS.density,
      CONFIG_KEYS.shape,
      CONFIG_KEYS.fontFamily,
      CONFIG_KEYS.fontScale,
      CONFIG_KEYS.theme,
      CONFIG_KEYS.litellmEndpoint,
      CONFIG_KEYS.litellmModel,
    ];
    for (const k of keys) {
      expect(isSecret(k), `${k} ne doit pas être filtré`).toBe(false);
    }
  });

  // --- L3 : modèle (config non sensible) + clé IA (keychain, write-only) ---

  it("setLitellmModel persiste le modèle (clé non sensible)", async () => {
    const { api, store } = makeApi();
    const { result } = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.setLitellmModel("llama3.1:8b");
    });
    expect(api.configSet).toHaveBeenCalledWith("litellm_model", "llama3.1:8b");
    expect(store["litellm_model"]).toBe("llama3.1:8b");
    expect(result.current.litellmModel).toBe("llama3.1:8b");
  });

  it("relit litellm_model persisté au montage", async () => {
    const { api } = makeApi({ [CONFIG_KEYS.litellmModel]: "qwen2.5" });
    const { result } = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.litellmModel).toBe("qwen2.5");
  });

  it("aiKeySet reflète la présence d'une clé sans jamais lire sa valeur", async () => {
    const { api } = makeApi();
    const { result } = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    // Au montage : aucune clé.
    expect(result.current.aiKeySet).toBe(false);
    // setAiKey écrit via aiSetKey (write-only) PUIS reflète la présence.
    await act(async () => {
      await result.current.setAiKey("sk-secret");
    });
    expect(api.aiSetKey).toHaveBeenCalledWith("sk-secret");
    expect(result.current.aiKeySet).toBe(true);
    // Aucune commande de LECTURE de la clé n'existe sur la façade.
    expect(
      (api as unknown as Record<string, unknown>)["aiGetKey"],
    ).toBeUndefined();
    // Valeur vide → retrait de la clé.
    await act(async () => {
      await result.current.setAiKey("");
    });
    expect(result.current.aiKeySet).toBe(false);
  });
});

describe("applyToDom / parsePrefs", () => {
  it("applyToDom est inerte sans cible", () => {
    expect(() => applyToDom(null, "x", DEFAULT_UI)).not.toThrow();
  });

  it("parsePrefs ignore les valeurs invalides et garde les défauts", () => {
    const ui = parsePrefsExport({
      [CONFIG_KEYS.shape]: "triangle",
      [CONFIG_KEYS.fontScale]: "9999",
      [CONFIG_KEYS.navPos]: "right",
    });
    expect(ui.shape).toBe(DEFAULT_UI.shape); // invalide → défaut
    expect(ui.fontScale).toBe(DEFAULT_UI.fontScale); // hors borne → défaut
    expect(ui.navPos).toBe("right"); // valide
  });
});
