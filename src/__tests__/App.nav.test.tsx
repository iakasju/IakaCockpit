import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../App";

// Shell de navigation : App câble de nombreux hooks dont les effets passent par la
// façade (invoke). En test on stube les modules Tauri — invoke en attente perpétuelle
// (les hooks restent dans leur état initial vide, AUCUN rejet bruyant), listen rend un
// unlisten no-op, dialog résout null. On teste UNIQUEMENT le routage de nav (L12).
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => new Promise(() => {})),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(() => Promise.resolve(null)),
}));

describe("App — nav vers Iakajournal (L12)", () => {
  it("affiche la vue Iakajournal au clic du bouton de nav", () => {
    render(<App />);
    // Démarre sur Portfolio : pas encore de main courante visible.
    expect(screen.queryByRole("complementary", { name: "Main courante" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Iakajournal" }));

    // La vue Iakajournal héberge la main courante (L4) en pleine page.
    expect(
      screen.getByRole("complementary", { name: "Main courante" }),
    ).toBeTruthy();
  });
});
