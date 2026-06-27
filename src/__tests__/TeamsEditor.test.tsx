import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamsEditor } from "../components/TeamsEditor";
import {
  defaultTeamFromDemo,
  DEFAULT_TEAM_ID,
  type Team,
  type UseTeams,
} from "../hooks/useTeams";

function makeTeams(overrides: Partial<UseTeams> = {}): UseTeams {
  const team = defaultTeamFromDemo("lotr");
  return {
    teams: [team],
    loaded: true,
    defaultTeamId: DEFAULT_TEAM_ID,
    teamForProject: () => team,
    coordinatorOf: (t) => t.agents.find((a) => a.id === t.coordinator) ?? null,
    agentInTeam: (t, name) =>
      t.agents.find((a) => a.name.toLowerCase() === name.toLowerCase()) ?? null,
    hasBinding: () => false,
    upsertTeam: vi.fn(async () => {}),
    removeTeam: vi.fn(async () => {}),
    upsertAgent: vi.fn(async () => {}),
    removeAgent: vi.fn(async () => {}),
    setCoordinator: vi.fn(async () => {}),
    bindProjectTeam: vi.fn(async () => {}),
    reload: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("TeamsEditor — définition team/agents (L11)", () => {
  it("régler le runner d'un agent appelle upsertAgent avec le nouveau runner", () => {
    const upsertAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ upsertAgent })} />);
    const select = screen.getByLabelText("Runner de gimli") as HTMLSelectElement;
    // Les 4 runners sont sélectionnables (AR-2).
    const values = Array.from(select.querySelectorAll("option")).map((o) => o.value);
    expect(values).toEqual(["claude-code", "ollama", "litellm", "codex"]);
    expect(Array.from(select.querySelectorAll("option")).some((o) => o.disabled)).toBe(
      false,
    );
    fireEvent.change(select, { target: { value: "ollama" } });
    expect(upsertAgent).toHaveBeenCalledWith(
      DEFAULT_TEAM_ID,
      expect.objectContaining({ id: "gimli", runner: "ollama" }),
    );
  });

  it("éditer le modèle (onBlur) appelle upsertAgent", () => {
    const upsertAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ upsertAgent })} />);
    const field = screen.getByLabelText("Modèle de gimli") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "qwen2.5-coder" } });
    fireEvent.blur(field);
    expect(upsertAgent).toHaveBeenCalledWith(
      DEFAULT_TEAM_ID,
      expect.objectContaining({ id: "gimli", model: "qwen2.5-coder" }),
    );
  });

  it("éditer les skills (CSV onBlur) appelle upsertAgent avec la liste parsée", () => {
    const upsertAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ upsertAgent })} />);
    const field = screen.getByLabelText("Skills de gimli") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "iakaframe-gimli, iakaframe-dev" } });
    fireEvent.blur(field);
    expect(upsertAgent).toHaveBeenCalledWith(
      DEFAULT_TEAM_ID,
      expect.objectContaining({
        id: "gimli",
        skills: ["iakaframe-gimli", "iakaframe-dev"],
      }),
    );
  });

  it("désigner le coordinateur appelle setCoordinator", () => {
    const setCoordinator = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ setCoordinator })} />);
    const select = screen.getByLabelText("Coordinateur de la team") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "gandalf" } });
    expect(setCoordinator).toHaveBeenCalledWith(DEFAULT_TEAM_ID, "gandalf");
  });

  it("retirer le coordinateur est désactivé (garde)", () => {
    render(<TeamsEditor teams={makeTeams()} />);
    // Aragorn = coordinateur par défaut → son bouton « Retirer » est désactivé.
    const card = document.querySelector('[data-agent="aragorn"]')!;
    const removeBtn = card.querySelector("button") as HTMLButtonElement;
    expect(removeBtn.disabled).toBe(true);
  });

  it("retirer un agent ≠ coordinateur appelle removeAgent", () => {
    const removeAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ removeAgent })} />);
    const card = document.querySelector('[data-agent="gandalf"]')!;
    const removeBtn = card.querySelector("button") as HTMLButtonElement;
    expect(removeBtn.disabled).toBe(false);
    fireEvent.click(removeBtn);
    expect(removeAgent).toHaveBeenCalledWith(DEFAULT_TEAM_ID, "gandalf");
  });

  it("créer une team appelle upsertTeam avec un id slugifié", () => {
    const upsertTeam = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ upsertTeam })} />);
    fireEvent.change(screen.getByLabelText("Nom de la nouvelle team"), {
      target: { value: "Mon Équipe Pro" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));
    expect(upsertTeam).toHaveBeenCalledWith(
      expect.objectContaining({ id: "mon-equipe-pro", name: "Mon Équipe Pro" }),
    );
  });

  it("ajouter un agent appelle upsertAgent", () => {
    const upsertAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ upsertAgent })} />);
    fireEvent.change(screen.getByLabelText("Nom du nouvel agent"), {
      target: { value: "Boromir" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(upsertAgent).toHaveBeenCalledWith(
      DEFAULT_TEAM_ID,
      expect.objectContaining({ id: "boromir", name: "Boromir", runner: "claude-code" }),
    );
  });

  it("avertissement honnête si le coordinateur est sur un runner non exécutable", () => {
    const team: Team = defaultTeamFromDemo("lotr");
    // Met le coordinateur (aragorn) sur ollama.
    team.agents = team.agents.map((a) =>
      a.id === "aragorn" ? { ...a, runner: "ollama" } : a,
    );
    render(<TeamsEditor teams={makeTeams({ teams: [team] })} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("ne pilotera pas encore");
  });

  it("supprimer la team par défaut est désactivé (garde)", () => {
    render(<TeamsEditor teams={makeTeams()} />);
    const del = screen.getByRole("button", { name: "Supprimer la team" });
    expect((del as HTMLButtonElement).disabled).toBe(true);
  });
});
