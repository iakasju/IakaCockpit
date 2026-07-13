import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "../i18n";
import { PerimeterColumn } from "../components/analytics/PerimeterColumn";
import { deriveAnalytics, rangeFromPreset, ALL_SCOPE } from "../hooks/useAnalytics";
import type { TreemapItem } from "../components/TreemapPanel";

const ECONOMY: TreemapItem[] = [
  { project: "small", tokens: 100_000, segments: [] },
  { project: "big", tokens: 500_000, segments: [] },
  { project: "mid", tokens: 250_000, segments: [] },
];

function entries() {
  return deriveAnalytics(ECONOMY, [], ALL_SCOPE, rangeFromPreset("7d", Date.now()))
    .perimeter;
}

describe("PerimeterColumn (L30-P1)", () => {
  it("rend ALL · portefeuille en tête puis les projets triés tokens desc", () => {
    const { container } = render(
      <PerimeterColumn entries={entries()} scope={ALL_SCOPE} onSelect={() => {}} />,
    );
    const names = [...container.querySelectorAll(".pitem .pnm")].map(
      (n) => n.textContent,
    );
    expect(names[0]).toBe("ALL · portefeuille");
    expect(names.slice(1)).toEqual(["big", "mid", "small"]);
  });

  it("marque le scope courant avec la classe `on`", () => {
    const { container } = render(
      <PerimeterColumn entries={entries()} scope="big" onSelect={() => {}} />,
    );
    const on = container.querySelector(".pitem.on");
    expect(on?.querySelector(".pnm")?.textContent).toBe("big");
  });

  it("remonte l'id du projet sélectionné au clic", () => {
    const onSelect = vi.fn();
    render(
      <PerimeterColumn entries={entries()} scope={ALL_SCOPE} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText("mid"));
    expect(onSelect).toHaveBeenCalledWith("mid");
  });
});
