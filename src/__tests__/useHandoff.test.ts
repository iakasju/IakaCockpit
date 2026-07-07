import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useHandoff } from "../hooks/useHandoff";
import type { Team } from "../hooks/useTeams";
import type { Backend } from "../api/backend";

/** Un paquet forge en mémoire (canal simulé), avec empreinte contrôlée. */
function pkg(originHash: string, teamName = "iakaframe") {
  const team = {
    id: "iakaframe",
    name: teamName,
    methodId: "iakaframe",
    vignetteTeam: "none",
    coordinator: "aragorn",
    personas: [
      {
        id: "aragorn",
        name: "Aragorn",
        roleKey: "coordination",
        royaume: "COORDINATION",
        roleIndex: 1,
        skills: [],
        guardrails: [],
      },
    ],
    connectors: [],
  };
  const manifest = {
    source: "forge",
    teamId: "iakaframe",
    teamName,
    version: originHash,
    timestamp: "2026-07-07T10:00:00.000Z",
    originHash,
  };
  return { team_json: JSON.stringify(team), handoff_json: JSON.stringify(manifest) };
}

/**
 * Backend simulé : un canal de handoff mutable + une config en mémoire (miroir de configSet/All).
 * Permet de rejouer la recette bout-en-bout (réception → provenance → conflit) sans Tauri.
 */
function mockBackend(channel: Record<string, { team_json: string; handoff_json: string }>) {
  const config: Record<string, string> = {};
  const imported: Team[] = [];
  const api = {
    isTauri: () => false,
    handoffList: vi.fn(async () => Object.keys(channel)),
    handoffRead: vi.fn(async (teamId: string) => channel[teamId] ?? { team_json: null, handoff_json: null }),
    nowMillis: vi.fn(async () => Date.UTC(2026, 6, 7, 11, 0, 0)),
    configAll: vi.fn(async () => ({ ...config })),
    configSet: vi.fn(async (k: string, v: string) => {
      config[k] = v;
    }),
    configGet: vi.fn(async (k: string) => config[k] ?? null),
  } as unknown as Backend;
  const importTeam = vi.fn(async (t: Team) => {
    imported.push(t);
  });
  return { api, importTeam, imported, config };
}

async function ready(api: Backend, importTeam: (t: Team) => Promise<void>) {
  const hook = renderHook(() => useHandoff({ api, importTeam }));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("useHandoff (réception H1)", () => {
  it("liste les livraisons du canal", async () => {
    const { api, importTeam } = mockBackend({ iakaframe: pkg("aaaa1111") });
    const { result } = await ready(api, importTeam);
    expect(result.current.deliveries).toEqual(["iakaframe"]);
  });

  it("importe une livraison → team dans le roster + provenance localEdits=false", async () => {
    const { api, importTeam, imported } = mockBackend({ iakaframe: pkg("aaaa1111") });
    const { result } = await ready(api, importTeam);

    let outcome;
    await act(async () => {
      outcome = await result.current.importDelivery("iakaframe");
    });
    expect(outcome!.status).toBe("imported");
    expect(imported).toHaveLength(1);
    expect(imported[0].id).toBe("iakaframe");
    expect(imported[0].agents[0].runner).toBe("claude-code"); // défaut cockpit
    const prov = result.current.provenanceFor("iakaframe");
    expect(prov!.originHash).toBe("aaaa1111");
    expect(prov!.localEdits).toBe(false);
    expect(prov!.importedAt).toBe("2026-07-07T11:00:00.000Z");
  });

  it("ré-import du MÊME paquet = idempotent (aucune ré-écriture)", async () => {
    const { api, importTeam, imported } = mockBackend({ iakaframe: pkg("aaaa1111") });
    const { result } = await ready(api, importTeam);

    await act(async () => {
      await result.current.importDelivery("iakaframe");
    });
    let outcome;
    await act(async () => {
      outcome = await result.current.importDelivery("iakaframe");
    });
    expect(outcome!.status).toBe("unchanged");
    expect(imported).toHaveLength(1); // pas de second import
  });

  it("marque l'édition locale → badge (localEdits=true)", async () => {
    const { api, importTeam } = mockBackend({ iakaframe: pkg("aaaa1111") });
    const { result } = await ready(api, importTeam);
    await act(async () => {
      await result.current.importDelivery("iakaframe");
    });
    await act(async () => {
      await result.current.markLocalEdit("iakaframe");
    });
    expect(result.current.provenanceFor("iakaframe")!.localEdits).toBe(true);
  });

  it("CONFLIT explicite au ré-import d'une NOUVELLE livraison après édition locale", async () => {
    const channel = { iakaframe: pkg("aaaa1111") };
    const { api, importTeam, imported } = mockBackend(channel);
    const { result } = await ready(api, importTeam);

    // 1. Réception initiale.
    await act(async () => {
      await result.current.importDelivery("iakaframe");
    });
    // 2. Édition locale (dérive).
    await act(async () => {
      await result.current.markLocalEdit("iakaframe");
    });
    // 3. Nouvelle livraison forge (empreinte différente).
    channel.iakaframe = pkg("bbbb2222", "iakaframe-v2");

    let outcome;
    await act(async () => {
      outcome = await result.current.importDelivery("iakaframe");
    });
    // → conflit, PAS d'écrasement silencieux.
    expect(outcome!.status).toBe("conflict");
    expect(imported).toHaveLength(1); // la 2e livraison n'a PAS été importée
    expect(result.current.provenanceFor("iakaframe")!.originHash).toBe("aaaa1111"); // inchangé
  });

  it("résolution « garder local » n'importe rien ; « prendre la forge » écrase et réaligne", async () => {
    const channel = { iakaframe: pkg("aaaa1111") };
    const { api, importTeam, imported } = mockBackend(channel);
    const { result } = await ready(api, importTeam);

    await act(async () => {
      await result.current.importDelivery("iakaframe");
    });
    await act(async () => {
      await result.current.markLocalEdit("iakaframe");
    });
    channel.iakaframe = pkg("bbbb2222", "iakaframe-v2");

    // Garder local : aucun import, provenance inchangée.
    let keep;
    await act(async () => {
      keep = await result.current.importDelivery("iakaframe", "keep-local");
    });
    expect(keep!.status).toBe("unchanged");
    expect(imported).toHaveLength(1);
    expect(result.current.provenanceFor("iakaframe")!.originHash).toBe("aaaa1111");

    // Prendre la forge : import, provenance réalignée, localEdits repart à false.
    let take;
    await act(async () => {
      take = await result.current.importDelivery("iakaframe", "take-forge");
    });
    expect(take!.status).toBe("imported");
    expect(imported).toHaveLength(2);
    const prov = result.current.provenanceFor("iakaframe")!;
    expect(prov.originHash).toBe("bbbb2222");
    expect(prov.localEdits).toBe(false);
  });

  it("paquet illisible → invalid, jamais d'exception", async () => {
    const { api, importTeam } = mockBackend({});
    const { result } = await ready(api, importTeam);
    let outcome;
    await act(async () => {
      outcome = await result.current.importDelivery("inexistante");
    });
    expect(outcome!.status).toBe("invalid");
  });
});
