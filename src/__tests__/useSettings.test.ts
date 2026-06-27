import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useSettings,
  applyToDom,
  parsePrefsExport,
  CONFIG_KEYS,
  DEFAULT_UI,
  DEFAULT_THEME,
  DEFAULT_TEAM,
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
  // Présence d'un token webhook n8n simulée (jamais la valeur — L6/D3).
  let n8nTokenPresent = false;
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
    couchHasCredentials: vi.fn(async () => false),
    n8nHasToken: vi.fn(async () => n8nTokenPresent),
    n8nSetToken: vi.fn(async (value: string) => {
      n8nTokenPresent = value.trim().length > 0;
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

  it("L14 : setTheme applique aussi une charte iakagraph non-naonedge (data-theme)", async () => {
    const { api, store } = makeApi();
    const dom = makeDom();
    const { result } = renderHook(() => useSettings({ api, dom }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.setTheme("os-windows");
    });
    expect(api.configSet).toHaveBeenCalledWith("theme", "os-windows");
    expect(store["theme"]).toBe("os-windows");
    expect(dom.attrs["data-theme"]).toBe("os-windows");
  });

  it("L9-A3 : setTeam persiste la team (configSet 'ui_team') et un remontage la relit", async () => {
    const { api, store } = makeApi();
    const dom1 = makeDom();
    const first = renderHook(() => useSettings({ api, dom: dom1 }));
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    // Défaut documenté.
    expect(first.result.current.team).toBe(DEFAULT_TEAM);

    await act(async () => {
      await first.result.current.setTeam("avengers");
    });
    expect(api.configSet).toHaveBeenCalledWith(CONFIG_KEYS.team, "avengers");
    expect(store[CONFIG_KEYS.team]).toBe("avengers");

    // Remontage (= redémarrage) : la team est retrouvée.
    const dom2 = makeDom();
    const second = renderHook(() => useSettings({ api, dom: dom2 }));
    await waitFor(() => expect(second.result.current.loaded).toBe(true));
    expect(second.result.current.team).toBe("avengers");
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

  // --- L6 : canal adresse externe (n8n) ---

  it("setN8nWebhookUrl persiste l'URL (clé non sensible)", async () => {
    const { api, store } = makeApi();
    const { result } = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.setN8nWebhookUrl("http://localhost:5678/webhook/x");
    });
    expect(api.configSet).toHaveBeenCalledWith(
      "n8n_webhook_url",
      "http://localhost:5678/webhook/x",
    );
    expect(store["n8n_webhook_url"]).toBe("http://localhost:5678/webhook/x");
    expect(result.current.n8nWebhookUrl).toBe(
      "http://localhost:5678/webhook/x",
    );
  });

  it("support actif : défaut slack, persisté, relu au montage, valide", async () => {
    const { api, store } = makeApi();
    const first = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    expect(first.result.current.n8nActiveSupport).toBe("slack");
    await act(async () => {
      await first.result.current.setN8nActiveSupport("discord");
    });
    expect(api.configSet).toHaveBeenCalledWith("n8n_active_support", "discord");
    expect(store["n8n_active_support"]).toBe("discord");
    // Remontage : la valeur est retrouvée.
    const second = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(second.result.current.loaded).toBe(true));
    expect(second.result.current.n8nActiveSupport).toBe("discord");
  });

  it("support invalide en config retombe sur le défaut (slack)", async () => {
    const { api } = makeApi({ n8n_active_support: "carrier-pigeon" });
    const { result } = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.n8nActiveSupport).toBe("slack");
  });

  it("n8nTokenSet reflète la présence du token sans jamais lire sa valeur", async () => {
    const { api } = makeApi();
    const { result } = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.n8nTokenSet).toBe(false);
    await act(async () => {
      await result.current.setN8nToken("tok-secret");
    });
    expect(api.n8nSetToken).toHaveBeenCalledWith("tok-secret");
    expect(result.current.n8nTokenSet).toBe(true);
    // Aucune commande de LECTURE du token n'existe sur la façade.
    expect(
      (api as unknown as Record<string, unknown>)["n8nGetToken"],
    ).toBeUndefined();
    await act(async () => {
      await result.current.setN8nToken("");
    });
    expect(result.current.n8nTokenSet).toBe(false);
  });

  it("les clés n8n ne matchent PAS le filtre secret (configAll)", () => {
    const isSecret = (k: string): boolean =>
      /token|key|secret|password/i.test(k);
    for (const k of [CONFIG_KEYS.n8nWebhookUrl, CONFIG_KEYS.n8nActiveSupport]) {
      expect(isSecret(k), `${k} ne doit pas être filtré`).toBe(false);
    }
  });

  // --- L10b/P3 : réglages globaux du chef-runner + canal pensée ---

  it("réglages chef-runner : défauts documentés au montage", async () => {
    const { api } = makeApi();
    const { result } = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.chefRunnerKind).toBe("claude-code");
    expect(result.current.chefModel).toBe(""); // vide → défaut Rust
    expect(result.current.chefAllowedTools).toBe("");
    expect(result.current.chefTrustMode).toBe("inherit");
    expect(result.current.hidePensee).toBe(true);
  });

  it("setChefModel/AllowedTools/TrustMode persistent et se relisent au remontage", async () => {
    const { api, store } = makeApi();
    const first = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    await act(async () => {
      await first.result.current.setChefModel("claude-sonnet-4-5");
      await first.result.current.setChefAllowedTools("Read,Glob,Edit");
      await first.result.current.setChefTrustMode("accept");
    });
    expect(api.configSet).toHaveBeenCalledWith(
      CONFIG_KEYS.chefModel,
      "claude-sonnet-4-5",
    );
    expect(store[CONFIG_KEYS.chefAllowedTools]).toBe("Read,Glob,Edit");
    expect(store[CONFIG_KEYS.chefTrustMode]).toBe("accept");
    // Remontage : valeurs retrouvées.
    const second = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(second.result.current.loaded).toBe(true));
    expect(second.result.current.chefModel).toBe("claude-sonnet-4-5");
    expect(second.result.current.chefAllowedTools).toBe("Read,Glob,Edit");
    expect(second.result.current.chefTrustMode).toBe("accept");
  });

  it("trust mode invalide en config retombe sur le défaut (inherit)", async () => {
    const { api } = makeApi({ [CONFIG_KEYS.chefTrustMode]: "yolo" });
    const { result } = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.chefTrustMode).toBe("inherit");
  });

  it("setHidePensee persiste l'état (string booléen) et se relit au remontage", async () => {
    const { api, store } = makeApi();
    const first = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    await act(async () => {
      await first.result.current.setHidePensee(false);
    });
    expect(api.configSet).toHaveBeenCalledWith(CONFIG_KEYS.hidePensee, "false");
    expect(store[CONFIG_KEYS.hidePensee]).toBe("false");
    const second = renderHook(() => useSettings({ api, dom: makeDom() }));
    await waitFor(() => expect(second.result.current.loaded).toBe(true));
    expect(second.result.current.hidePensee).toBe(false);
  });

  it("les clés chef-runner ne matchent PAS le filtre secret (configAll)", () => {
    const isSecret = (k: string): boolean =>
      /token|key|secret|password/i.test(k);
    for (const k of [
      CONFIG_KEYS.chefRunnerKind,
      CONFIG_KEYS.chefModel,
      CONFIG_KEYS.chefAllowedTools,
      CONFIG_KEYS.chefTrustMode,
      CONFIG_KEYS.hidePensee,
    ]) {
      expect(isSecret(k), `${k} ne doit pas être filtré`).toBe(false);
    }
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
