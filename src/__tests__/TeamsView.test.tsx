import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamsView } from "../views/TeamsView";
import {
  defaultTeamFromDemo,
  DEFAULT_TEAM_ID,
  type UseTeams,
} from "../hooks/useTeams";

/** Stub de `useTeams` : une team par défaut éditable, setters spies. */
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

describe("TeamsView — éditeur teams/agents en pleine page (L13)", () => {
  it("héberge l'éditeur « Teams & agents » (runner par agent)", () => {
    const { container } = render(<TeamsView teams={makeTeams()} />);
    // L'éditeur L11 est rendu (heading + édition par agent).
    expect(
      screen.getByRole("heading", { name: "Équipes & agents" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Runner de aragorn")).toBeTruthy();
    // La vue porte sa classe dédiée (pleine page).
    expect(container.querySelector("section.teams")).toBeTruthy();
  });
});
