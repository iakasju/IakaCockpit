import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../i18n";
import { TreemapPanel } from "../components/TreemapPanel";

describe("TreemapPanel (L18 #5b)", () => {
  it("vide → placeholder honnête", () => {
    render(<TreemapPanel items={[]} />);
    expect(screen.getByText(/à brancher/)).toBeTruthy();
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
    expect(screen.getByText("iaka-demo")).toBeTruthy();
    expect(screen.getByText("autre")).toBeTruthy();
    // Part : 100k / 150k ≈ 67 %.
    expect(screen.getByText(/67%/)).toBeTruthy();
  });
});
