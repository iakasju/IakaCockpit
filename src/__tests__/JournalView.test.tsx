import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { JournalView } from "../views/JournalView";

// L12 : la vue héberge `MainCourante` (L4), qui porte son hook `useMainCourante` →
// `fetchMainCourante` (invoke). En test on garde l'invoke en attente perpétuelle :
// le composant rend sa structure (titre + filtres) sans I/O résolu ni rejet bruyant.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => new Promise(() => {})),
}));

describe("JournalView — main courante en pleine page (L12)", () => {
  it("rend la main courante (3 canaux)", () => {
    const { container } = render(<JournalView />);
    // Le composant MainCourante est présent (landmark « Main courante » + titre de
    // page « Journal », direction A : eyebrow « Main courante » + h1 « Journal »).
    expect(
      screen.getByRole("complementary", { name: "Main courante" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Journal" })).toBeTruthy();
    // La vue porte sa classe dédiée (pleine page).
    expect(container.querySelector("section.journal")).toBeTruthy();
  });
});
