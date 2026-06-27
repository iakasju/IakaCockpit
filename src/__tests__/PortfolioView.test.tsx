import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioView } from "../views/PortfolioView";
import type { Project } from "../api/backend";

// Garde-fou : si une régression réintroduisait la main courante dans Portfolio, son
// hook tenterait un invoke. On le neutralise (sans effet attendu : MainCourante ne
// doit plus être rendu ici depuis L12).
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => new Promise(() => {})),
}));

const PROJECTS: Project[] = [
  {
    id: "alpha",
    name: "alpha",
    path: "/root/alpha",
    isGit: true,
    branch: "main",
    dirty: false,
  } as unknown as Project,
];

function renderView() {
  return render(
    <PortfolioView
      projects={PROJECTS}
      loading={false}
      error={null}
      root="/root"
      worksetIds={new Set()}
      worksetCount={0}
      onToggleWork={vi.fn()}
      onGotoWork={vi.fn()}
    />,
  );
}

describe("PortfolioView — recentré sur le portefeuille (L12)", () => {
  it("rend le portefeuille (titre + tuiles)", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Portfolio" })).toBeTruthy();
    expect(screen.getByText("alpha")).toBeTruthy();
  });

  it("ne rend PLUS la main courante (sortie vers Iakajournal, L12)", () => {
    renderView();
    expect(screen.queryByRole("complementary", { name: "Main courante" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Main courante" })).toBeNull();
  });
});
