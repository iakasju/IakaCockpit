import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../i18n";
import { TreemapPanel } from "../components/TreemapPanel";

describe("TreemapPanel (L18 #5b)", () => {
  it("vide → placeholder honnête (sans « prochain incrément »)", () => {
    render(<TreemapPanel items={[]} />);
    expect(screen.getByText(/Aucun coût mesuré/)).toBeTruthy();
  });

  it("rend une cellule par projet avec tokens + part", () => {
    render(
      <TreemapPanel
        items={[
          { project: "iaka-demo", tokens: 100_000, segments: [{ label: "a", tokens: 100_000 }] },
          { project: "autre", tokens: 50_000, segments: [{ label: "b", tokens: 50_000 }] },
        ]}
      />,
    );
    // Le nom apparaît dans la cellule ET dans la légende (Loki P1-3) → au moins une fois.
    expect(screen.getAllByText("iaka-demo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("autre").length).toBeGreaterThanOrEqual(1);
    // Part : 100k / 150k ≈ 67 %.
    expect(screen.getByText(/67%/)).toBeTruthy();
  });

  it("rend la légende treemap (pastilles + note de lecture, Loki P1-3)", () => {
    render(
      <TreemapPanel
        items={[
          { project: "iaka-demo", tokens: 100_000, segments: [{ label: "a", tokens: 100_000 }] },
        ]}
      />,
    );
    expect(screen.getByText(/surface ∝ tokens · segments = part par agent/)).toBeTruthy();
  });
});
