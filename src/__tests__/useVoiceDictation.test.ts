import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useVoiceDictation,
  isMeaningfulSpeech,
} from "../hooks/useVoiceDictation";
import type { Backend } from "../api/backend";

/**
 * L16 reciblé — dictée vocale dans le chat (auto-envoi). On mocke la façade
 * (`isTauri`/`voiceListen`) et on vérifie : transcript parlant → auto-envoi ;
 * transcript vide/non-parlant → RIEN ; dégradation hors natif / sur erreur.
 */
function mockApi(over: Partial<Backend> = {}): Backend {
  return {
    isTauri: vi.fn().mockReturnValue(true),
    voiceListen: vi.fn().mockResolvedValue("lance le build"),
    ...over,
  } as unknown as Backend;
}

describe("isMeaningfulSpeech (garde anti-vide)", () => {
  it("accepte de la vraie parole", () => {
    expect(isMeaningfulSpeech("lance le build")).toBe(true);
    expect(isMeaningfulSpeech("ok")).toBe(true);
  });
  it("rejette silence et annotations non-parlantes", () => {
    expect(isMeaningfulSpeech("...")).toBe(false);
    expect(isMeaningfulSpeech("[Musique]")).toBe(false);
    expect(isMeaningfulSpeech("(rires)")).toBe(false);
    expect(isMeaningfulSpeech("")).toBe(false);
    expect(isMeaningfulSpeech("   ")).toBe(false);
  });
});

describe("useVoiceDictation (L16 reciblé)", () => {
  it("auto-envoie le transcript parlant", async () => {
    const onText = vi.fn<(t: string) => void>();
    const api = mockApi({
      voiceListen: vi.fn().mockResolvedValue("  montre le plan  "),
    });
    const { result } = renderHook(() => useVoiceDictation(onText, api));

    await act(async () => {
      await result.current.listen();
    });

    expect(onText).toHaveBeenCalledWith("montre le plan");
    expect(result.current.status).toBe("idle");
  });

  it("n'envoie RIEN sur un transcript non-parlant", async () => {
    const onText = vi.fn<(t: string) => void>();
    const api = mockApi({ voiceListen: vi.fn().mockResolvedValue("[Musique]") });
    const { result } = renderHook(() => useVoiceDictation(onText, api));

    await act(async () => {
      await result.current.listen();
    });

    expect(onText).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("mode dégradé hors contexte natif (pas d'appel STT)", async () => {
    const onText = vi.fn<(t: string) => void>();
    const voiceListen = vi.fn();
    const api = mockApi({ isTauri: vi.fn().mockReturnValue(false), voiceListen });
    const { result } = renderHook(() => useVoiceDictation(onText, api));

    await act(async () => {
      await result.current.listen();
    });

    expect(result.current.status).toBe("unsupported");
    expect(voiceListen).not.toHaveBeenCalled();
    expect(onText).not.toHaveBeenCalled();
  });

  it("dégrade proprement si le STT échoue", async () => {
    const onText = vi.fn<(t: string) => void>();
    const api = mockApi({
      voiceListen: vi.fn().mockRejectedValue(new Error("no mic")),
    });
    const { result } = renderHook(() => useVoiceDictation(onText, api));

    await act(async () => {
      await result.current.listen();
    });

    await waitFor(() => expect(result.current.status).toBe("unsupported"));
    expect(onText).not.toHaveBeenCalled();
  });
});
