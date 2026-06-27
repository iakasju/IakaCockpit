import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamPicker } from "../components/TeamPicker";
import { defaultTeamFromDemo, type Team } from "../hooks/useTeams";

const teamA: Team = { ...defaultTeamFromDemo("lotr"), id: "iakaframe", name: "iakaframe" };
const teamB: Team = { ...defaultTeamFromDemo("avengers"), id: "ngc", name: "NGC" };

function renderPicker(over: Partial<Parameters<typeof TeamPicker>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const onManageTeams = vi.fn();
  render(
    <TeamPicker
      projectLabel="iaka-demo"
      teams={[teamA, teamB]}
      defaultTeamId="ngc"
      onConfirm={onConfirm}
      onCancel={onCancel}
      onManageTeams={onManageTeams}
      {...over}
    />,
  );
  return { onConfirm, onCancel, onManageTeams };
}

describe("TeamPicker — popup de liaison projet↔team (L11)", () => {
  it("liste les teams existantes et pré-sélectionne la dernière utilisée", () => {
    renderPicker();
    const select = screen.getByLabelText("Teams disponibles") as HTMLSelectElement;
    const values = Array.from(select.querySelectorAll("option")).map((o) => o.value);
    expect(values).toEqual(["iakaframe", "ngc"]);
    expect(select.value).toBe("ngc"); // defaultTeamId
  });

  it("repli pré-sélection sur la 1ʳᵉ team si defaultTeamId absent", () => {
    renderPicker({ defaultTeamId: "inexistante" });
    const select = screen.getByLabelText("Teams disponibles") as HTMLSelectElement;
    expect(select.value).toBe("iakaframe");
  });

  it("Confirmer renvoie la team sélectionnée", () => {
    const { onConfirm } = renderPicker();
    fireEvent.change(screen.getByLabelText("Teams disponibles"), {
      target: { value: "iakaframe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledWith("iakaframe");
  });

  it("Confirmer sans changer renvoie la pré-sélection (dernière utilisée)", () => {
    const { onConfirm } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledWith("ngc");
  });

  it("Annuler n'appelle pas onConfirm", () => {
    const { onConfirm, onCancel } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("« Gérer les teams… » ouvre l'écran Settings", () => {
    const { onManageTeams } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Gérer / créer les teams…" }));
    expect(onManageTeams).toHaveBeenCalledTimes(1);
  });

  it("le titre porte le nom du projet", () => {
    renderPicker();
    expect(
      screen.getByRole("dialog", { name: "Relier iaka-demo à une team" }),
    ).toBeTruthy();
  });
});
