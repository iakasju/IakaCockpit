import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../i18n";
import { MemoryGauge } from "../components/MemoryGauge";
import { compactionFrontiers } from "../hooks/useEconomy";
import type { EcoPoint } from "../hooks/useEconomy";

function pt(input: number): EcoPoint {
  return { input, output: 1, sidechain: false };
}

describe("MemoryGauge (L18 #6) — jauge + frontière compaction", () => {
  it("empty-state si série vide", () => {
    render(<MemoryGauge series={[]} />);
    expect(screen.getByText("Contexte non mesuré.")).toBeTruthy();
  });

  it("occupation = input du dernier tour / max", () => {
    render(<MemoryGauge series={[pt(50000), pt(100000)]} maxTokens={200000} />);
    expect(screen.getByText("100k / 200k")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50");
  });

  it("compactionFrontiers détecte une chute brutale d'input (< 60 %)", () => {
    // 120k → 40k = compaction au tour 2.
    expect(compactionFrontiers([pt(80000), pt(120000), pt(40000), pt(60000)])).toEqual([2]);
    // Croissance régulière → aucune frontière.
    expect(compactionFrontiers([pt(10000), pt(20000), pt(30000)])).toEqual([]);
  });

  it("affiche le compteur de compaction quand une frontière existe", () => {
    render(<MemoryGauge series={[pt(120000), pt(40000), pt(60000)]} />);
    expect(screen.getByText(/1 compaction/)).toBeTruthy();
  });
});
