import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PortfolioView } from "../views/PortfolioView";
import type { Project } from "../api/backend";
import type { TreemapItem } from "../components/TreemapPanel";

afterEach(cleanup);

// Garde-fou : si une régression réintroduisait la main courante dans Portfolio, son
// hook tenterait un invoke. On le neutralise (MainCourante ne doit plus être rendu ici).
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => new Promise(() => {})),
}));

const project = (id: string, over: Partial<Project> = {}): Project =>
  ({
    id,
    path: `/root/${id}`,
    is_git: true,
    branch: "main",
    dirty: false,
    ahead: 0,
    behind: 0,
    last_commit_date: null,
    last_commit_subject: `commit ${id}`,
    version: null,
    work_status: "stable",
    ...over,
  }) as Project;

const eco = (p: string, tokens: number): TreemapItem => ({
  project: p,
  tokens,
  segments: [],
});

function renderView(over: Partial<Parameters<typeof PortfolioView>[0]> = {}) {
  return render(
    <PortfolioView
      projects={[project("alpha")]}
      loading={false}
      error={null}
      root="/root"
      worksetIds={new Set()}
      worksetCount={0}
      onToggleWork={vi.fn()}
      onGotoWork={vi.fn()}
      {...over}
    />,
  );
}

describe("PortfolioView — Étagère conforme au mock (L21)", () => {
  it("rend l'étagère (titre)", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Étagère" })).toBeTruthy();
  });

  it("ne rend PLUS la main courante (sortie vers Journal, L12)", () => {
    renderView();
    expect(
      screen.queryByRole("complementary", { name: "Main courante" }),
    ).toBeNull();
    expect(screen.queryByRole("heading", { name: "Main courante" })).toBeNull();
  });

  it("partitionne table (cartes) vs atelier (lignes) avec compteurs exacts", () => {
    renderView({
      projects: [project("alpha"), project("beta"), project("gamma")],
      worksetIds: new Set(["alpha", "beta"]),
      worksetCount: 2,
    });
    expect(screen.getByText("Posés sur la table · 2")).toBeTruthy();
    expect(screen.getByText("Rangés dans l'atelier · 1")).toBeTruthy();
    // gamma (hors table) rendu en LIGNE atelier (chemin visible).
    expect(screen.getByText("/root/gamma")).toBeTruthy();
  });

  it("anneau % scopé à la table : alpha 75 %, beta 25 % (gamma hors total)", () => {
    renderView({
      projects: [project("alpha"), project("beta"), project("gamma")],
      worksetIds: new Set(["alpha", "beta"]),
      worksetCount: 2,
      economy: [eco("alpha", 75_000), eco("beta", 25_000), eco("gamma", 999_000)],
    });
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText("75k")).toBeTruthy();
  });

  it("chip « ● en cours » pour un projet à conversation vivante", () => {
    renderView({
      projects: [project("alpha")],
      worksetIds: new Set(["alpha"]),
      worksetCount: 1,
      liveProjectIds: new Set(["alpha"]),
    });
    expect(screen.getByText("● en cours")).toBeTruthy();
  });

  it("table vide → message honnête, aucun anneau", () => {
    renderView({
      projects: [project("alpha")],
      worksetIds: new Set(),
      worksetCount: 0,
    });
    expect(
      screen.getByText(/Aucun projet sur la table/),
    ).toBeTruthy();
  });
});
