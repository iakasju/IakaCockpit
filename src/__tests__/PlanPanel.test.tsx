import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../i18n";
import { PlanPanel } from "../components/PlanPanel";

describe("PlanPanel (L18 #3) — checklist du plan vivant", () => {
  it("empty-state honnête si aucun plan", () => {
    render(<PlanPanel items={null} />);
    expect(screen.getByText("Aucun plan en cours.")).toBeTruthy();
  });

  it("rend la checklist + le compteur fait/total", () => {
    render(
      <PlanPanel
        items={[
          { content: "Cadrer", status: "completed" },
          { content: "Coder", status: "in_progress" },
          { content: "Tester", status: "pending" },
        ]}
      />,
    );
    expect(screen.getByText("Cadrer")).toBeTruthy();
    expect(screen.getByText("Coder")).toBeTruthy();
    expect(screen.getByText("Tester")).toBeTruthy();
    expect(screen.getByText("1/3 fait")).toBeTruthy();
    // Statut porté en classe (rendu différencié).
    expect(document.querySelector(".planitem.ps-in_progress")).toBeTruthy();
    expect(document.querySelector(".planitem.ps-completed")).toBeTruthy();
  });
});
