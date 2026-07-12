import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  // L16-F2 — double-clic sur une cellule → onOpenInWork(projectId).
  it("double-clic sur une cellule appelle onOpenInWork avec le bon projectId", () => {
    const onOpenInWork = vi.fn();
    const { container } = render(
      <TreemapPanel
        items={[
          { project: "iaka-demo", tokens: 100_000, segments: [{ label: "a", tokens: 100_000 }] },
          { project: "autre", tokens: 50_000, segments: [{ label: "b", tokens: 50_000 }] },
        ]}
        onOpenInWork={onOpenInWork}
      />,
    );
    const cells = container.querySelectorAll(".tcell");
    expect(cells.length).toBe(2);
    fireEvent.doubleClick(cells[1]);
    expect(onOpenInWork).toHaveBeenCalledTimes(1);
    expect(onOpenInWork).toHaveBeenCalledWith("autre");
  });

  it("sans onOpenInWork : le double-clic est inerte (pas de handler câblé)", () => {
    const { container } = render(
      <TreemapPanel
        items={[
          { project: "iaka-demo", tokens: 100_000, segments: [{ label: "a", tokens: 100_000 }] },
        ]}
      />,
    );
    // Ne doit pas lever : aucun handler attaché.
    expect(() =>
      fireEvent.doubleClick(container.querySelector(".tcell")!),
    ).not.toThrow();
  });
});
