import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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

  // L16-F1 — toggle Liste ↔ Tuiles de l'atelier (atelier seul, défaut = Liste).
  describe("toggle Liste/Tuiles de l'atelier (L16-F1)", () => {
    it("défaut = Liste : le projet rangé est rendu en ligne `.scanrow` (pas en carte)", () => {
      const { container } = renderView({
        projects: [project("gamma")],
        worksetIds: new Set(),
        worksetCount: 0,
      });
      expect(container.querySelector(".scanrow")).toBeTruthy();
      // Aucune carte `.proj` (table vide + atelier en liste).
      expect(container.querySelector(".proj")).toBeNull();
      // Toggle visible avec « Liste » actif.
      const list = screen.getByRole("button", { name: "Liste" });
      expect(list.getAttribute("aria-pressed")).toBe("true");
    });

    it("bascule sur « Tuiles » : le projet rangé passe en carte `.proj`, plus de `.scanrow`", () => {
      const { container } = renderView({
        projects: [project("gamma")],
        worksetIds: new Set(),
        worksetCount: 0,
      });
      fireEvent.click(screen.getByRole("button", { name: "Tuiles" }));
      expect(container.querySelector(".proj")).toBeTruthy();
      expect(container.querySelector(".scanrow")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Tuiles" }).getAttribute("aria-pressed"),
      ).toBe("true");
    });

    it("tuile d'atelier : action « + poser » appelle onToggleWork, tokens « — » (zéro fausse donnée)", () => {
      const onToggleWork = vi.fn();
      renderView({
        projects: [project("gamma")],
        worksetIds: new Set(),
        worksetCount: 0,
        onToggleWork,
      });
      fireEvent.click(screen.getByRole("button", { name: "Tuiles" }));
      // Bouton d'action de la tuile atelier = « poser sur la table ».
      const put = screen.getByRole("button", { name: "Poser gamma sur la table" });
      expect(put.textContent).toBe("+");
      fireEvent.click(put);
      expect(onToggleWork).toHaveBeenCalledWith("gamma");
      // Tokens neutres « — » (projet hors table → pas de coût scopé).
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });
  });
});
