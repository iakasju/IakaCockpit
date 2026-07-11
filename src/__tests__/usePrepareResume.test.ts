import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePrepareResume } from "../hooks/usePrepareResume";
import type { Backend, ResumeReport } from "../api/backend";

function report(over: Partial<ResumeReport> = {}): ResumeReport {
  return {
    ok: true,
    path: "/home/u/work/alpha",
    is_git: true,
    branch: "main",
    commit_count: 3,
    dirty: false,
    wrote_path: "/home/u/work/alpha/specs/etat-des-lieux.md",
    ...over,
  };
}

function makeApi(impl: () => Promise<ResumeReport>) {
  return { prepareResume: vi.fn(impl) } as unknown as Pick<
    Backend,
    "prepareResume"
  >;
}

describe("usePrepareResume — statut du job par projet (L23)", () => {
  it("état initial : aucune entrée", () => {
    const api = makeApi(async () => report());
    const { result } = renderHook(() => usePrepareResume(api));
    expect(result.current.entries).toEqual([]);
  });

  it("prepare → running puis done ; appelle prepareResume(path) UNE fois", async () => {
    const api = makeApi(async () => report());
    const { result } = renderHook(() => usePrepareResume(api));
    act(() => {
      result.current.prepare("alpha", "alpha", "/home/u/work/alpha");
    });
    // Statut synchrone = running (le retrait UI n'attend pas le job).
    expect(result.current.entries[0]?.status).toBe("running");
    await waitFor(() =>
      expect(result.current.entries[0]?.status).toBe("done"),
    );
    expect(api.prepareResume).toHaveBeenCalledWith("/home/u/work/alpha");
    expect(api.prepareResume).toHaveBeenCalledTimes(1);
  });

  it("done hors git → marque horsGit (pour le libellé « prête (hors git) »)", async () => {
    const api = makeApi(async () => report({ is_git: false }));
    const { result } = renderHook(() => usePrepareResume(api));
    act(() => {
      result.current.prepare("beta", "beta", "/home/u/work/beta");
    });
    await waitFor(() => expect(result.current.entries[0]?.status).toBe("done"));
    expect(result.current.entries[0]?.horsGit).toBe(true);
  });

  it("rejet → statut error avec message lisible (pas de crash)", async () => {
    const api = makeApi(async () => {
      throw new Error("dossier introuvable");
    });
    const { result } = renderHook(() => usePrepareResume(api));
    act(() => {
      result.current.prepare("gamma", "gamma", "/nope");
    });
    await waitFor(() => expect(result.current.entries[0]?.status).toBe("error"));
    expect(result.current.entries[0]?.message).toContain("dossier introuvable");
  });

  it("dismiss retire l'entrée terminée", async () => {
    const api = makeApi(async () => report());
    const { result } = renderHook(() => usePrepareResume(api));
    act(() => {
      result.current.prepare("alpha", "alpha", "/home/u/work/alpha");
    });
    await waitFor(() => expect(result.current.entries[0]?.status).toBe("done"));
    act(() => result.current.dismiss("alpha"));
    expect(result.current.entries).toEqual([]);
  });
});
