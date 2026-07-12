import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import i18n from "../i18n";
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

/** Direction A : sélectionne un agent dans la liste pour ouvrir sa FICHE. */
function selectAgent(id: string): void {
  fireEvent.click(document.querySelector(`[data-agent="${id}"]`)!);
}

describe("TeamsEditor — définition team/agents (L11, liste + fiche)", () => {
  it("régler le runner d'un agent appelle upsertAgent avec le nouveau runner", () => {
    const upsertAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ upsertAgent })} />);
    selectAgent("gimli");
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

  it("le rôle est un menu des 7 rôles canoniques ; le changer appelle upsertAgent", () => {
    const upsertAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ upsertAgent })} />);
    selectAgent("gimli");
    const select = screen.getByLabelText("Rôle de gimli") as HTMLSelectElement;
    const values = Array.from(select.querySelectorAll("option")).map(
      (o) => o.value,
    );
    // Les 7 rôles canoniques, dans l'ordre roleIndex.
    expect(values).toEqual([
      "portefeuille",
      "coordination",
      "architecture",
      "fabrication",
      "tests",
      "graphisme",
      "doc",
    ]);
    // Gimli = fabrication par défaut.
    expect(select.value).toBe("fabrication");
    fireEvent.change(select, { target: { value: "doc" } });
    expect(upsertAgent).toHaveBeenCalledWith(
      DEFAULT_TEAM_ID,
      expect.objectContaining({ id: "gimli", royaume: "doc" }),
    );
  });

  it("garde B : le menu de rôle PILOTE roleIndex (doc → royaume doc + roleIndex 6)", () => {
    const upsertAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ upsertAgent })} />);
    selectAgent("gimli");
    const select = screen.getByLabelText("Rôle de gimli") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "doc" } });
    // Sélectionner « doc » (canonique, roleIndex 6) fixe royaume ET roleIndex.
    expect(upsertAgent).toHaveBeenCalledWith(
      DEFAULT_TEAM_ID,
      expect.objectContaining({ id: "gimli", royaume: "doc", roleIndex: 6 }),
    );
  });

  it("garde B : une valeur de rôle hors-liste ne touche QUE le royaume (roleIndex manuel)", () => {
    const upsertAgent = vi.fn(async () => {});
    const team: Team = defaultTeamFromDemo("lotr");
    team.agents = team.agents.map((a) =>
      a.id === "gimli" ? { ...a, royaume: "GALADRIEL", roleIndex: 3 } : a,
    );
    render(<TeamsEditor teams={makeTeams({ teams: [team], upsertAgent })} />);
    selectAgent("gimli");
    const select = screen.getByLabelText("Rôle de gimli") as HTMLSelectElement;
    // Re-sélectionner la valeur hors-liste ne PILOTE pas roleIndex : il reste manuel (3).
    fireEvent.change(select, { target: { value: "GALADRIEL" } });
    expect(upsertAgent).toHaveBeenCalledWith(
      DEFAULT_TEAM_ID,
      expect.objectContaining({ id: "gimli", royaume: "GALADRIEL", roleIndex: 3 }),
    );
  });

  it("garde B : deux agents au même roleIndex → avertissement d'unicité", () => {
    const team: Team = defaultTeamFromDemo("lotr");
    // Force une collision : Gimli passe sur le roleIndex d'Aragorn (1).
    team.agents = team.agents.map((a) =>
      a.id === "gimli" ? { ...a, roleIndex: 1 } : a,
    );
    render(<TeamsEditor teams={makeTeams({ teams: [team] })} />);
    selectAgent("gimli");
    expect(
      screen.getByText(
        "Cet index est déjà utilisé par un autre agent — ils partageront la même vignette.",
      ),
    ).toBeTruthy();
  });

  it("rôle hors-liste (team L15) : valeur courante conservée comme option (tolérant)", () => {
    const team: Team = defaultTeamFromDemo("lotr");
    // Force un royaume dérivé hors des 7 rôles (cas teams catalogue L15).
    team.agents = team.agents.map((a) =>
      a.id === "gimli" ? { ...a, royaume: "GALADRIEL" } : a,
    );
    render(<TeamsEditor teams={makeTeams({ teams: [team] })} />);
    selectAgent("gimli");
    const select = screen.getByLabelText("Rôle de gimli") as HTMLSelectElement;
    const values = Array.from(select.querySelectorAll("option")).map(
      (o) => o.value,
    );
    // La valeur hors-liste est présente (jamais perdue) + les 7 canoniques.
    expect(values).toContain("GALADRIEL");
    expect(values).toHaveLength(8);
    expect(select.value).toBe("GALADRIEL");
  });

  it("éditer le modèle (onBlur) appelle upsertAgent", () => {
    const upsertAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ upsertAgent })} />);
    selectAgent("gimli");
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
    selectAgent("gimli");
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
    // Aragorn = coordinateur → fiche montrée par défaut, son « Retirer du casting » désactivé.
    selectAgent("aragorn");
    const removeBtn = screen.getByRole("button", {
      name: "Retirer du casting",
    }) as HTMLButtonElement;
    expect(removeBtn.disabled).toBe(true);
  });

  it("retirer un agent ≠ coordinateur appelle removeAgent", () => {
    const removeAgent = vi.fn(async () => {});
    render(<TeamsEditor teams={makeTeams({ removeAgent })} />);
    // Ouvre la fiche de Gandalf (≠ coordinateur) puis retire-le.
    selectAgent("gandalf");
    const removeBtn = screen.getByRole("button", {
      name: "Retirer du casting",
    }) as HTMLButtonElement;
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
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter un agent" }));
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

describe("TeamsEditor — rendu EN (aucun menu/select mélangé FR/EN)", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });
  afterAll(async () => {
    await i18n.changeLanguage("fr");
    cleanup();
  });

  it("le role-select rend les 7 rôles traduits en EN (aucun libellé FR résiduel)", () => {
    render(<TeamsEditor teams={makeTeams()} />);
    selectAgent("gimli");
    const select = screen.getByLabelText("Role of gimli") as HTMLSelectElement;
    const labels = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    // Libellés EN attendus, dans l'ordre roleIndex (fabrication → "Build", etc.).
    expect(labels).toEqual([
      "Portfolio",
      "Coordination",
      "Architecture",
      "Build",
      "Testing",
      "Design",
      "Docs",
    ]);
    // Aucun libellé FR distinctif ne doit subsister dans le menu.
    expect(labels).not.toContain("Fabrication");
    expect(labels).not.toContain("Graphisme");
  });

  it("le runner-select rend les libellés EN + suffixe « definable » (pas « définissable »)", () => {
    render(<TeamsEditor teams={makeTeams()} />);
    selectAgent("gimli");
    const select = screen.getByLabelText("Runner of gimli") as HTMLSelectElement;
    const labels = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(labels[0]).toBe("Claude Code (native TUI)");
    // Suffixe EN sur les runners non exécutables (ollama/litellm/codex).
    expect(labels.some((l) => l?.includes(" — definable"))).toBe(true);
    expect(labels.some((l) => l?.includes("définissable"))).toBe(false);
  });

  it("le rail d'agents traduit le rôle en EN (cohérent avec la fiche — plus de mélange)", () => {
    render(<TeamsEditor teams={makeTeams()} />);
    // Gimli = fabrication → le rail doit afficher « Build » (EN), pas « Fabrication ».
    const row = document.querySelector('[data-agent="gimli"]') as HTMLElement;
    expect(within(row).getByText("Build")).toBeTruthy();
    expect(within(row).queryByText("Fabrication")).toBeNull();
  });
});
