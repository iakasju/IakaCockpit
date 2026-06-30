import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ShelfRow } from "../components/ShelfRow";
import type { Project } from "../api/backend";

afterEach(cleanup);

const project = (over: Partial<Project> = {}): Project =>
  ({
    id: "iakabox",
    path: "~/work/iakabox",
    is_git: true,
    branch: "main",
    dirty: false,
    ahead: 0,
    behind: 0,
    last_commit_date: null,
    last_commit_subject: null,
    version: null,
    work_status: "stable",
    ...over,
  }) as Project;

describe("ShelfRow — ligne de l'atelier (L21/B)", () => {
  it("rend nom, chemin et statut git réel (branche · état)", () => {
    render(<ShelfRow project={project()} onPut={vi.fn()} />);
    expect(screen.getByText("iakabox")).toBeTruthy();
    expect(screen.getByText("~/work/iakabox")).toBeTruthy();
    expect(screen.getByText("main · clean")).toBeTruthy();
  });

  it("dépôt modifié → statut dirty (pas de tag inventé, AR-3)", () => {
    render(<ShelfRow project={project({ dirty: true })} onPut={vi.fn()} />);
    expect(screen.getByText("main · dirty")).toBeTruthy();
    // Aucun tag « infra · docker » : omis en MVP.
    expect(screen.queryByText(/infra|docker/)).toBeNull();
  });

  it("bouton « ↗ Poser sur la table » pose le projet (workset.add)", () => {
    const onPut = vi.fn();
    render(<ShelfRow project={project()} onPut={onPut} />);
    fireEvent.click(screen.getByText("↗ Poser sur la table"));
    expect(onPut).toHaveBeenCalledWith("iakabox");
  });
});
