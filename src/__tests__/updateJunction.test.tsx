/**
 * Jonction hook ↔ vue du contrôle manuel de mise à jour (L34, critère C4).
 *
 * POURQUOI CE FICHIER EXISTE. Les deux moitiés étaient couvertes SÉPARÉMENT :
 * `useAppUpdate.test.tsx` prouve que `check(true)` rend l'erreur visible, et
 * `SettingsView.test.tsx` prouve que le bouton appelle son `onCheckUpdate`.
 * Aucune des deux ne traverse le CÂBLAGE d'`App` — mutation mesurée : remplacer
 * `appUpdate.check(true)` par `appUpdate.check()` dans `App.tsx` laissait les
 * 780 tests VERTS, alors que C4 (« le contrôle manuel parle ») était cassé net.
 *
 * Ces tests cliquent donc réellement « Vérifier les mises à jour » depuis l'App
 * complète et assertent ce que l'utilisateur VOIT. C'est l'argument `true` qui
 * est en jeu : sans lui, l'erreur reste `visible: false` et l'écran ne dit rien.
 *
 * Plugins Tauri mockés, AUCUN accès réseau (même condition que le reste du lot).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => new Promise(() => {})),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(() => Promise.resolve(null)),
}));

const h = vi.hoisted(() => ({
  checkMock: vi.fn(),
  relaunchMock: vi.fn(),
  getVersionMock: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-updater", () => ({ check: () => h.checkMock() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: () => h.relaunchMock() }));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: () => h.getVersionMock() }));

import App from "../App";

beforeEach(() => {
  h.checkMock.mockReset();
  h.relaunchMock.mockReset();
  h.getVersionMock.mockReset();
  h.getVersionMock.mockResolvedValue("0.31.2");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Ouvre les Réglages et rend le bouton de contrôle manuel. */
function openUpdateSection(): HTMLElement {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Réglages" }));
  return screen.getByRole("button", { name: "Vérifier les mises à jour" });
}

describe("App ↔ Réglages — jonction du contrôle manuel (C4)", () => {
  it("affiche l'erreur à l'écran quand le contrôle demandé échoue (box injoignable)", async () => {
    h.checkMock.mockRejectedValue(new Error("box injoignable"));

    fireEvent.click(openUpdateSection());

    // Le message n'apparaît QUE si le câblage a demandé un contrôle verbeux.
    // C'est l'assertion qui tue la mutation `check(true)` → `check()`.
    expect(
      await screen.findByText("Vérification impossible : box injoignable"),
    ).toBeTruthy();
    expect(h.checkMock).toHaveBeenCalledTimes(1);
  });

  it("affiche le verdict « à jour » quand le contrôle demandé aboutit", async () => {
    h.checkMock.mockResolvedValue(null);

    fireEvent.click(openUpdateSection());

    // L'aller-retour hook → vue passe aussi dans le cas nominal : la jonction est
    // exercée dans les deux sens, pas seulement sur l'échec.
    expect(await screen.findByText("L'application est à jour.")).toBeTruthy();
    expect(h.checkMock).toHaveBeenCalledTimes(1);
  });
});
