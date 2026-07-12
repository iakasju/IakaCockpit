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
    description: null,
    backlog_remaining: null,
    backlog_next: null,
    work_status: "stable",
    ...over,
  }) as Project;

/** La pastille d'urgence est le point `.dot.urg` en tête de ligne (helper partagé F4-bis). */
const urgDot = (c: HTMLElement): HTMLElement => c.querySelector<HTMLElement>(".dot.urg")!;

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

describe("ShelfRow — pastille d'urgence unifiée liste ↔ tuile (F4-bis)", () => {
  it("backlog absent (null) → pastille grise « none » + libellé « pas de backlog »", () => {
    const { container } = render(
      <ShelfRow project={project({ backlog_remaining: null })} onPut={vi.fn()} />,
    );
    const dot = urgDot(container);
    expect(dot.className).toContain("urg-none");
    expect(dot.getAttribute("aria-label")).toMatch(/[Pp]as de backlog/);
    expect(dot.getAttribute("title")).toMatch(/[Pp]as de backlog/);
  });

  it("backlog tout coché (0) → pastille verte « done »", () => {
    const { container } = render(
      <ShelfRow project={project({ backlog_remaining: 0 })} onPut={vi.fn()} />,
    );
    expect(urgDot(container).className).toContain("urg-done");
    expect(urgDot(container).getAttribute("aria-label")).toMatch(/rien en attente/);
  });

  it("1..4 étapes → pastille ambre « mid »", () => {
    const { container } = render(
      <ShelfRow project={project({ backlog_remaining: 3 })} onPut={vi.fn()} />,
    );
    expect(urgDot(container).className).toContain("urg-mid");
    expect(urgDot(container).getAttribute("aria-label")).toMatch(/3 étape\(s\) restante\(s\)/);
  });

  it(">= 5 étapes → pastille rouge « high » (même mapping que la tuile)", () => {
    const { container } = render(
      <ShelfRow project={project({ backlog_remaining: 7 })} onPut={vi.fn()} />,
    );
    expect(urgDot(container).className).toContain("urg-high");
    expect(urgDot(container).getAttribute("aria-label")).toMatch(/Urgent/);
  });

  it("le statut git RESTE dans `.meta` (rien de perdu), la pastille ne le remplace pas", () => {
    const { container } = render(
      <ShelfRow project={project({ dirty: true, backlog_remaining: 2 })} onPut={vi.fn()} />,
    );
    // pastille = urgence (pas le git)
    expect(urgDot(container).className).toContain("urg-mid");
    // git toujours affiché dans la ligne méta
    expect(screen.getByText("main · dirty")).toBeTruthy();
    // l'ancien point de statut git `.dot.i/.o` n'existe plus
    expect(container.querySelector(".dot.i")).toBeNull();
    expect(container.querySelector(".dot.o")).toBeNull();
  });
});
