import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePortfolio } from "../hooks/usePortfolio";
import type { Backend, Project } from "../api/backend";

const proj: Project = {
  id: "p1",
  path: "/root/p1",
  is_git: true,
  branch: "main",
  dirty: false,
  ahead: 0,
  behind: 0,
  last_commit_date: null,
  last_commit_subject: "init",
  version: "0.1.0",
  work_status: "stable",
};

function mockApi(over: Partial<Backend> = {}): Backend {
  return {
    getRoot: vi.fn().mockResolvedValue("/root"),
    scanPortfolio: vi.fn().mockResolvedValue([proj]),
    listExtraProjects: vi.fn().mockResolvedValue([]),
    addProject: vi.fn(),
    pickDirectory: vi.fn(),
    ...over,
  } as unknown as Backend;
}

describe("usePortfolio", () => {
  it("charge la racine puis scanne (loading → success)", async () => {
    const api = mockApi();
    const { result } = renderHook(() => usePortfolio(api));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.root).toBe("/root");
    expect(result.current.projects).toEqual([proj]);
    expect(result.current.error).toBeNull();
    expect(api.scanPortfolio).toHaveBeenCalledWith("/root");
  });

  it("propage l'erreur de scan (error, projets vidés)", async () => {
    const api = mockApi({
      scanPortfolio: vi.fn().mockRejectedValue(new Error("scan KO")),
    });
    const { result } = renderHook(() => usePortfolio(api));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("scan KO");
    expect(result.current.projects).toEqual([]);
  });

  it("refresh re-scanne la racine courante", async () => {
    const api = mockApi();
    const { result } = renderHook(() => usePortfolio(api));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.refresh();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getRoot).toHaveBeenCalledTimes(2);
  });

  it("fusionne les projets importés (hors racine, dédupliqués par chemin)", async () => {
    const extra: Project = { ...proj, id: "ext", path: "/ailleurs/ext" };
    const api = mockApi({
      listExtraProjects: vi.fn().mockResolvedValue([extra, proj]), // proj = doublon de chemin
    });
    const { result } = renderHook(() => usePortfolio(api));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // base [proj] + extra unique (proj filtré car même chemin que la base)
    expect(result.current.projects).toEqual([proj, extra]);
  });

  it("importProject : sélection → addProject → refresh, renvoie le projet", async () => {
    const imported: Project = { ...proj, id: "ext", path: "/ailleurs/ext" };
    const api = mockApi({
      pickDirectory: vi.fn().mockResolvedValue("/ailleurs/ext"),
      addProject: vi.fn().mockResolvedValue(imported),
      listExtraProjects: vi.fn().mockResolvedValue([imported]),
    });
    const { result } = renderHook(() => usePortfolio(api));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: Project | null = null;
    await act(async () => {
      returned = await result.current.importProject();
    });
    expect(api.addProject).toHaveBeenCalledWith("/ailleurs/ext");
    expect(returned).toEqual(imported);
    expect(result.current.projects).toContainEqual(imported);
  });

  it("importProject : annulation utilisateur → null, pas d'ajout", async () => {
    const api = mockApi({
      pickDirectory: vi.fn().mockResolvedValue(null),
    });
    const { result } = renderHook(() => usePortfolio(api));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: Project | null = proj;
    await act(async () => {
      returned = await result.current.importProject();
    });
    expect(returned).toBeNull();
    expect(api.addProject).not.toHaveBeenCalled();
  });
});
