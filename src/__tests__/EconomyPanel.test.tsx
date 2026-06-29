import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../i18n";
import { EconomyPanel } from "../components/EconomyPanel";

describe("EconomyPanel (L18 #5)", () => {
  it("empty-state si aucun tour", () => {
    render(<EconomyPanel series={[]} />);
    expect(screen.getByText("Aucun tour mesuré.")).toBeTruthy();
  });

  it("affiche les totaux + le split coordinateur/délégués", () => {
    render(
      <EconomyPanel
        series={[
          { input: 100, output: 10, sidechain: false },
          { input: 50, output: 6, sidechain: true },
        ]}
      />,
    );
    // Σ sortie = 16, Σ entrée = 150.
    expect(screen.getByText("16")).toBeTruthy();
    expect(screen.getByText("150")).toBeTruthy();
    // Split : coordinateur 10, délégués 6.
    expect(screen.getByText(/coordinateur 10/)).toBeTruthy();
    expect(screen.getByText(/délégués 6/)).toBeTruthy();
  });
});
