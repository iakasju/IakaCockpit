import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "../i18n";
import { EconomyShare } from "../components/EconomyShare";

afterEach(cleanup);

describe("EconomyShare (coordinateur vs délégués, option a MVP)", () => {
  it("coord+sub === 0 → empty-state honnête, aucun chiffre", () => {
    render(<EconomyShare coord={0} sub={0} />);
    expect(screen.getByText(/Aucun coût coordinateur\/délégués/)).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("rend la part coordinateur vs délégués (chiffres + pourcentages)", () => {
    // 62k coord + 86.2k sub = 148.2k → coord ≈ 42 %, sub ≈ 58 %.
    render(<EconomyShare coord={62_000} sub={86_200} />);
    // Spans de chiffres (le titre « Coordinateur vs délégués » est distinct).
    expect(screen.getByText(/Coordinateur 62k · 42%/)).toBeTruthy();
    expect(screen.getByText(/Délégués 86k · 58%/)).toBeTruthy();
  });
});
