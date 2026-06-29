import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../i18n";
import { MemoryGauge } from "../components/MemoryGauge";

describe("MemoryGauge (L18 #6)", () => {
  it("empty-state si contexte non mesuré (0)", () => {
    render(<MemoryGauge usedTokens={0} />);
    expect(screen.getByText("Contexte non mesuré.")).toBeTruthy();
  });

  it("affiche l'occupation et le pourcentage (used/max)", () => {
    render(<MemoryGauge usedTokens={100000} maxTokens={200000} />);
    expect(screen.getByText("100k / 200k")).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
  });

  it("plafonne à 100 % au-delà de la fenêtre", () => {
    render(<MemoryGauge usedTokens={300000} maxTokens={200000} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
  });
});
