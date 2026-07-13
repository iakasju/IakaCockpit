/**
 * useIndexStatus — poll borné du statut de l'index (2 phases). Prouve : hors-Tauri = tout prêt
 * (aucun indicateur en démo) ; en Tauri = re-poll jusqu'à `attrib_ready` puis arrêt.
 */
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useIndexStatus } from "../hooks/useIndexStatus";
import type { Backend, IndexStatus } from "../api/backend";

describe("useIndexStatus — 2 phases", () => {
  it("hors-Tauri : tout prêt (pas d'indicateur en démo)", async () => {
    const api = {
      isTauri: () => false,
      analyticsIndexStatus: () =>
        Promise.reject(new Error("ne doit pas être appelé")),
    } as unknown as Backend;
    const { result } = renderHook(() => useIndexStatus(50, api));
    expect(result.current).toEqual({ tokens_ready: true, attrib_ready: true });
  });

  it("Tauri : polle jusqu'à ce que la phase 2 (attrib) soit prête, puis s'arrête", async () => {
    // Séquence : phase1 seule → puis les deux prêtes.
    const seq: IndexStatus[] = [
      { tokens_ready: true, attrib_ready: false },
      { tokens_ready: true, attrib_ready: true },
    ];
    let calls = 0;
    const api = {
      isTauri: () => true,
      analyticsIndexStatus: () => {
        const s = seq[Math.min(calls, seq.length - 1)];
        calls += 1;
        return Promise.resolve(s);
      },
    } as unknown as Backend;

    const { result } = renderHook(() => useIndexStatus(20, api));
    // D'abord phase 1 seule (attrib pas prête).
    await waitFor(() => expect(result.current.tokens_ready).toBe(true));
    // Puis attribution prête après re-poll.
    await waitFor(() => expect(result.current.attrib_ready).toBe(true));
    const callsAtReady = calls;
    // Une fois prêt, le poll s'arrête (pas d'appels supplémentaires).
    await new Promise((r) => setTimeout(r, 80));
    expect(calls).toBe(callsAtReady);
  });
});
