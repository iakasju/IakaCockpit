import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../App";

// Shell de navigation : App câble de nombreux hooks dont les effets passent par la
// façade (invoke). En test on stube les modules Tauri — invoke en attente perpétuelle
// (les hooks restent dans leur état initial vide, AUCUN rejet bruyant), listen rend un
// unlisten no-op, dialog résout null. On teste UNIQUEMENT le routage de nav (L12/L13).
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => new Promise(() => {})),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(() => Promise.resolve(null)),
}));

describe("App — nav vers Analytics (L30-P1)", () => {
  it("affiche la vue Analytics au clic du bouton de nav (Journal débranché-gardé)", () => {
    render(<App />);
    // Démarre sur Portfolio : la page Analytics n'est pas visible.
    expect(
      screen.queryByRole("heading", { name: "Performance de l'équipe" }),
    ).toBeNull();
    // Le bouton rail « Journal » est remplacé par « Analytics ».
    expect(screen.queryByRole("button", { name: "Journal" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));

    // La vue Analytics héberge la colonne Périmètre + le titre de la page.
    expect(
      screen.getByRole("heading", { name: "Performance de l'équipe" }),
    ).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Périmètre" })).toBeTruthy();
  });
});

describe("App — nav vers Teams (L13)", () => {
  it("affiche la vue Teams au clic du bouton de nav", () => {
    render(<App />);
    // Démarre sur Portfolio : l'éditeur teams n'est pas visible.
    expect(
      screen.queryByRole("heading", { name: "Casting" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Équipes" }));

    // La vue Teams héberge l'éditeur teams/agents (L11) en pleine page.
    expect(
      screen.getByRole("heading", { name: "Casting" }),
    ).toBeTruthy();
  });
});
