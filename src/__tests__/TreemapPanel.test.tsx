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

  // Polish P3 — a11y clavier : cellule activable = role/tabIndex/aria-label + Enter/Espace.
  it("cellule activable : role=button, focusable, aria-label = projet + valeur", () => {
    const { container } = render(
      <TreemapPanel
        items={[
          { project: "iaka-demo", tokens: 100_000, segments: [{ label: "a", tokens: 100_000 }] },
        ]}
        onOpenInWork={() => {}}
      />,
    );
    const cell = container.querySelector(".tcell")!;
    expect(cell.getAttribute("role")).toBe("button");
    expect(cell.getAttribute("tabindex")).toBe("0");
    // aria-label contient le nom du projet ET la valeur formatée.
    const label = cell.getAttribute("aria-label") ?? "";
    expect(label).toContain("iaka-demo");
    expect(label).toContain("100k");
  });

  it("Enter sur une cellule déclenche onOpenInWork (même geste que le double-clic)", () => {
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
    fireEvent.keyDown(cells[1], { key: "Enter" });
    expect(onOpenInWork).toHaveBeenCalledWith("autre");
  });

  it("Espace sur une cellule déclenche aussi onOpenInWork", () => {
    const onOpenInWork = vi.fn();
    const { container } = render(
      <TreemapPanel
        items={[
          { project: "iaka-demo", tokens: 100_000, segments: [{ label: "a", tokens: 100_000 }] },
        ]}
        onOpenInWork={onOpenInWork}
      />,
    );
    fireEvent.keyDown(container.querySelector(".tcell")!, { key: " " });
    expect(onOpenInWork).toHaveBeenCalledWith("iaka-demo");
  });

  it("sans onOpenInWork : la cellule n'est pas un contrôle (ni role ni tabIndex)", () => {
    const { container } = render(
      <TreemapPanel
        items={[
          { project: "iaka-demo", tokens: 100_000, segments: [{ label: "a", tokens: 100_000 }] },
        ]}
      />,
    );
    const cell = container.querySelector(".tcell")!;
    expect(cell.getAttribute("role")).toBeNull();
    expect(cell.getAttribute("tabindex")).toBeNull();
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
