import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVoiceCommand } from "../hooks/useVoiceCommand";
import type { Backend } from "../api/backend";
import type { ViewId } from "../hooks/useGridState";

/**
 * L16-P1 — hook de pilotage vocal. On mocke la façade (`isTauri`/`voiceListen`)
 * et on vérifie la boucle transcript → dispatch → nav, plus la dégradation
 * propre hors natif / sur erreur. Le dispatcher pur est testé à part.
 */
function mockApi(over: Partial<Backend> = {}): Backend {
  return {
    isTauri: vi.fn().mockReturnValue(true),
    voiceListen: vi.fn().mockResolvedValue("montre le journal"),
    ...over,
  } as unknown as Backend;
}

describe("useVoiceCommand (L16-P1)", () => {
  it("transcrit puis navigue vers la vue reconnue", async () => {
    const nav = vi.fn<(view: ViewId) => void>();
    const api = mockApi({ voiceListen: vi.fn().mockResolvedValue("va au journal") });
    const { result } = renderHook(() => useVoiceCommand(nav, api));

    await act(async () => {
      await result.current.listen();
    });

    expect(nav).toHaveBeenCalledWith("journal");
    expect(result.current.status).toBe("idle");
    expect(result.current.notUnderstood).toBe(false);
    expect(result.current.lastTranscript).toBe("va au journal");
  });

  it("marque « pas compris » sans naviguer quand rien n'est reconnu", async () => {
    const nav = vi.fn<(view: ViewId) => void>();
    const api = mockApi({
      voiceListen: vi.fn().mockResolvedValue("quelle heure est-il"),
    });
    const { result } = renderHook(() => useVoiceCommand(nav, api));

    await act(async () => {
      await result.current.listen();
    });

    expect(nav).not.toHaveBeenCalled();
    expect(result.current.notUnderstood).toBe(true);
    expect(result.current.status).toBe("idle");
  });

  it("passe en mode dégradé hors contexte natif (pas d'appel STT)", async () => {
    const nav = vi.fn<(view: ViewId) => void>();
    const voiceListen = vi.fn();
    const api = mockApi({ isTauri: vi.fn().mockReturnValue(false), voiceListen });
    const { result } = renderHook(() => useVoiceCommand(nav, api));

    await act(async () => {
      await result.current.listen();
    });

    expect(result.current.status).toBe("unsupported");
    expect(voiceListen).not.toHaveBeenCalled();
    expect(nav).not.toHaveBeenCalled();
  });

  it("dégrade proprement si le STT natif échoue", async () => {
    const nav = vi.fn<(view: ViewId) => void>();
    const api = mockApi({
      voiceListen: vi.fn().mockRejectedValue(new Error("no mic")),
    });
    const { result } = renderHook(() => useVoiceCommand(nav, api));

    await act(async () => {
      await result.current.listen();
    });

    await waitFor(() => expect(result.current.status).toBe("unsupported"));
    expect(nav).not.toHaveBeenCalled();
  });

  it("reset efface le retour visuel", async () => {
    const nav = vi.fn<(view: ViewId) => void>();
    const api = mockApi({ voiceListen: vi.fn().mockResolvedValue("blabla") });
    const { result } = renderHook(() => useVoiceCommand(nav, api));

    await act(async () => {
      await result.current.listen();
    });
    expect(result.current.notUnderstood).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.notUnderstood).toBe(false);
    expect(result.current.lastTranscript).toBeNull();
  });
});
