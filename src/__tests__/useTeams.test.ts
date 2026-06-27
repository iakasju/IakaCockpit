import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useTeams,
  parseTeams,
  parseAgentRunnerKind,
  isExecutableRunner,
  defaultTeamFromDemo,
  teamFromCatalog,
  ensureDefaultTeams,
  DEFAULT_TEAM_ID,
  TEAMS_KEYS,
  type Agent,
  type Team,
} from "../hooks/useTeams";
import { TEAM_CATALOG } from "../assets/teams/catalog";
import type { Backend } from "../api/backend";

/** Backend mock : un store config en mémoire (roundtrip configSet/configAll/Get). */
function makeApi(initial: Record<string, string> = {}): Backend {
  const store: Record<string, string> = { ...initial };
  return {
    configAll: vi.fn(async () => ({ ...store })),
    configGet: vi.fn(async (k: string) => store[k] ?? null),
    configSet: vi.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
  } as unknown as Backend;
}

async function mounted(api: Backend) {
  const hook = renderHook(() => useTeams({ api }));
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return hook;
}

const AGENT = (over: Partial<Agent> = {}): Agent => ({
  id: "neo",
  name: "Neo",
  royaume: "MATRIX",
  roleIndex: 3,
  runner: "claude-code",
  model: "",
  skills: [],
  ...over,
});

describe("useTeams — pures (parse / runner)", () => {
  it("parseAgentRunnerKind : 4 runners valides, défaut claude-code sinon", () => {
    expect(parseAgentRunnerKind("ollama")).toBe("ollama");
    expect(parseAgentRunnerKind("litellm")).toBe("litellm");
    expect(parseAgentRunnerKind("codex")).toBe("codex");
    expect(parseAgentRunnerKind("claude-code")).toBe("claude-code");
    expect(parseAgentRunnerKind("bidon")).toBe("claude-code");
    expect(parseAgentRunnerKind(undefined)).toBe("claude-code");
  });

  it("isExecutableRunner : claude-code ET codex sont exécutables (terminal-source)", () => {
    expect(isExecutableRunner("claude-code")).toBe(true);
    expect(isExecutableRunner("codex")).toBe(true);
    expect(isExecutableRunner("ollama")).toBe(false);
    expect(isExecutableRunner("litellm")).toBe(false);
  });

  it("parseTeams défensif : absent/illisible/non-tableau → [] (A6)", () => {
    expect(parseTeams(undefined)).toEqual([]);
    expect(parseTeams("")).toEqual([]);
    expect(parseTeams("{pas du json")).toEqual([]);
    expect(parseTeams('{"id":"x"}')).toEqual([]); // objet, pas tableau
  });

  it("parseTeams ignore les records invalides mais garde les valides", () => {
    const json = JSON.stringify([
      { name: "sans id" }, // pas d'id → ignoré
      {
        id: "iakaframe",
        name: "iakaframe",
        coordinator: "aragorn",
        agents: [
          { name: "Aragorn", runner: "claude-code" },
          { runner: "ollama" }, // pas de name → ignoré
        ],
      },
    ]);
    const teams = parseTeams(json);
    expect(teams).toHaveLength(1);
    expect(teams[0].agents).toHaveLength(1);
    expect(teams[0].agents[0].id).toBe("aragorn"); // dérivé du name
  });

  it("parseTeams : coordinateur invalide → repli agents[0]", () => {
    const json = JSON.stringify([
      {
        id: "t",
        coordinator: "fantome",
        agents: [{ name: "Premier" }, { name: "Second" }],
      },
    ]);
    expect(parseTeams(json)[0].coordinator).toBe("premier");
  });

  it("defaultTeamFromDemo : 5 agents, coord aragorn, claude-code, skills connus", () => {
    const t = defaultTeamFromDemo("lotr");
    expect(t.id).toBe(DEFAULT_TEAM_ID);
    expect(t.vignetteTeam).toBe("lotr");
    expect(t.coordinator).toBe("aragorn");
    expect(t.agents).toHaveLength(5);
    expect(t.agents.every((a) => a.runner === "claude-code")).toBe(true);
    const gandalf = t.agents.find((a) => a.id === "gandalf");
    expect(gandalf?.skills).toEqual(["iakaframe-cadrage"]);
  });
});

describe("L15-B — catalogue & teams par défaut (teamFromCatalog / ensureDefaultTeams)", () => {
  it("le catalogue iakagraph expose 11 teams de 8 agents", () => {
    expect(TEAM_CATALOG).toHaveLength(11);
    for (const cat of TEAM_CATALOG) {
      expect(cat.agents).toHaveLength(8);
      // roleIndex = ordre (0..7).
      cat.agents.forEach((a, i) => expect(a.roleIndex).toBe(i));
    }
  });

  it("teamFromCatalog : coordinateur = roleIndex 1, runner claude-code, auto-casting, sans skill", () => {
    const lotr = TEAM_CATALOG.find((c) => c.id === "lotr")!;
    const team = teamFromCatalog(lotr);
    expect(team.id).toBe("lotr");
    expect(team.vignetteTeam).toBe("lotr"); // auto-casting
    expect(team.agents).toHaveLength(8);
    expect(team.agents.every((a) => a.runner === "claude-code")).toBe(true);
    expect(team.agents.every((a) => a.skills.length === 0)).toBe(true);
    // Coordinateur = agent à roleIndex 1 (slot coordination) = aragorn pour lotr.
    const coord = team.agents.find((a) => a.id === team.coordinator)!;
    expect(coord.roleIndex).toBe(1);
    expect(coord.id).toBe("aragorn");
    // name = slug, royaume = slug MAJUSCULE.
    expect(team.agents[0].name).toBe(team.agents[0].id);
    expect(team.agents[0].royaume).toBe(team.agents[0].id.toUpperCase());
  });

  it("teamFromCatalog : coordinateur avengers à roleIndex 1 = capamerica", () => {
    const team = teamFromCatalog(TEAM_CATALOG.find((c) => c.id === "avengers")!);
    expect(team.agents.find((a) => a.id === team.coordinator)?.roleIndex).toBe(1);
    expect(team.coordinator).toBe("capamerica");
  });

  it("ensureDefaultTeams : depuis vide → iakaframe (tête) + 11 catalogue, changed=true", () => {
    const { teams, changed } = ensureDefaultTeams([], "lotr");
    expect(changed).toBe(true);
    expect(teams).toHaveLength(12);
    expect(teams[0].id).toBe(DEFAULT_TEAM_ID);
    for (const cat of TEAM_CATALOG) {
      expect(teams.some((t) => t.id === cat.id)).toBe(true);
    }
  });

  it("ensureDefaultTeams : idempotent (2e passe → changed=false, pas de doublon)", () => {
    const first = ensureDefaultTeams([], "lotr");
    const second = ensureDefaultTeams(first.teams, "lotr");
    expect(second.changed).toBe(false);
    expect(second.teams).toHaveLength(12);
    expect(second.teams).toBe(first.teams); // même référence (aucun ajout)
  });

  it("ensureDefaultTeams : non destructif — team éditée préservée, manquantes ajoutées", () => {
    const edited: Team = { ...defaultTeamFromDemo("starfleet"), name: "Mon équipe" };
    const { teams, changed } = ensureDefaultTeams([edited], "lotr");
    expect(changed).toBe(true);
    // iakaframe déjà présent (édité) → conservé tel quel, pas réécrit.
    const iaka = teams.find((t) => t.id === DEFAULT_TEAM_ID)!;
    expect(iaka.name).toBe("Mon équipe");
    expect(iaka.vignetteTeam).toBe("starfleet");
    // Les 11 teams catalogue ajoutées en plus.
    expect(teams).toHaveLength(12);
  });
});

describe("useTeams — bootstrap & chargement", () => {
  it("A1/L15 : config vide → bootstrap iakaframe + 11 teams catalogue + persiste", async () => {
    const api = makeApi();
    const { result } = await mounted(api);
    // iakaframe (graine) + 11 teams du catalogue iakagraph = 12.
    expect(result.current.teams).toHaveLength(12);
    expect(result.current.teams[0].id).toBe(DEFAULT_TEAM_ID); // iakaframe en tête
    // Les teams catalogue sont présentes et sélectionnables.
    for (const id of ["lotr", "avengers", "starfleet", "xmen"]) {
      expect(result.current.teams.some((t) => t.id === id)).toBe(true);
    }
    expect(api.configSet).toHaveBeenCalledWith(
      TEAMS_KEYS.teams,
      expect.any(String),
    );
  });

  it("bootstrap respecte ui_team comme casting de la team par défaut", async () => {
    const api = makeApi({ [TEAMS_KEYS.uiTeam]: "avengers" });
    const { result } = await mounted(api);
    expect(result.current.teams[0].vignetteTeam).toBe("avengers");
  });

  it("team éditée préservée ; les 11 teams catalogue ajoutées (non destructif)", async () => {
    const team: Team = defaultTeamFromDemo("starfleet");
    team.name = "Mon équipe";
    const api = makeApi({ [TEAMS_KEYS.teams]: JSON.stringify([team]) });
    const { result } = await mounted(api);
    // iakaframe édité conservé tel quel.
    expect(result.current.teams[0].name).toBe("Mon équipe");
    expect(result.current.teams[0].vignetteTeam).toBe("starfleet");
    // + 11 teams catalogue ajoutées.
    expect(result.current.teams).toHaveLength(12);
    expect(result.current.teams.some((t) => t.id === "lotr")).toBe(true);
  });
});

describe("useTeams — résolution", () => {
  it("teamForProject : liaison existante → cette team ; sinon défaut", async () => {
    const other: Team = { ...defaultTeamFromDemo("lotr"), id: "autre", name: "Autre" };
    const api = makeApi({
      [TEAMS_KEYS.teams]: JSON.stringify([defaultTeamFromDemo("lotr"), other]),
      [`${TEAMS_KEYS.projectTeamPrefix}projA`]: "autre",
    });
    const { result } = await mounted(api);
    expect(result.current.teamForProject("projA").id).toBe("autre");
    // Projet non lié → team par défaut.
    expect(result.current.teamForProject("inconnu").id).toBe(DEFAULT_TEAM_ID);
  });

  it("teamForProject : liaison vers team disparue → repli défaut", async () => {
    const api = makeApi({
      [TEAMS_KEYS.teams]: JSON.stringify([defaultTeamFromDemo("lotr")]),
      [`${TEAMS_KEYS.projectTeamPrefix}projX`]: "team-supprimee",
    });
    const { result } = await mounted(api);
    expect(result.current.teamForProject("projX").id).toBe(DEFAULT_TEAM_ID);
  });

  it("coordinatorOf : coordinateur valide → lui ; invalide → agents[0]", async () => {
    const { result } = await mounted(makeApi());
    const team = result.current.teams[0];
    expect(result.current.coordinatorOf(team)?.id).toBe("aragorn");
    const broken: Team = { ...team, coordinator: "fantome" };
    expect(result.current.coordinatorOf(broken)?.id).toBe(team.agents[0].id);
  });

  it("agentInTeam : insensible casse, par nom ou id ; inconnu → null", async () => {
    const { result } = await mounted(makeApi());
    const team = result.current.teams[0];
    expect(result.current.agentInTeam(team, "gandalf")?.name).toBe("Gandalf");
    expect(result.current.agentInTeam(team, "GIMLI")?.id).toBe("gimli");
    expect(result.current.agentInTeam(team, "Sauron")).toBeNull();
  });

  it("hasBinding : vrai seulement si project_team:<id> existe", async () => {
    const api = makeApi({
      [TEAMS_KEYS.teams]: JSON.stringify([defaultTeamFromDemo("lotr")]),
      [`${TEAMS_KEYS.projectTeamPrefix}lie`]: DEFAULT_TEAM_ID,
    });
    const { result } = await mounted(api);
    expect(result.current.hasBinding("lie")).toBe(true);
    expect(result.current.hasBinding("pas-lie")).toBe(false);
  });
});

describe("useTeams — définition (CRUD + gardes)", () => {
  it("A3 : créer une team → persistée et relue au remontage", async () => {
    const api = makeApi();
    const { result } = await mounted(api);
    const newTeam: Team = {
      id: "ngc",
      name: "NGC",
      vignetteTeam: "starfleet",
      coordinator: "neo",
      agents: [AGENT()],
    };
    await act(async () => {
      await result.current.upsertTeam(newTeam);
    });
    expect(result.current.teams.some((t) => t.id === "ngc")).toBe(true);
    // Remontage : le store a bien le JSON.
    const remount = await mounted(api);
    expect(remount.result.current.teams.some((t) => t.id === "ngc")).toBe(true);
  });

  it("A4 : ajouter/éditer un agent + désigner coordinateur ; retirer ≠ coord OK", async () => {
    const { result } = await mounted(makeApi());
    const id = result.current.teams[0].id;
    await act(async () => {
      await result.current.upsertAgent(id, AGENT({ id: "trinity", name: "Trinity" }));
    });
    expect(
      result.current.teams[0].agents.some((a) => a.id === "trinity"),
    ).toBe(true);
    // Éditer (même id) → remplacement, pas d'ajout.
    await act(async () => {
      await result.current.upsertAgent(
        id,
        AGENT({ id: "trinity", name: "Trinity", runner: "ollama" }),
      );
    });
    const trinity = result.current.teams[0].agents.find((a) => a.id === "trinity");
    expect(trinity?.runner).toBe("ollama");
    // Désigner coordinateur.
    await act(async () => {
      await result.current.setCoordinator(id, "trinity");
    });
    expect(result.current.teams[0].coordinator).toBe("trinity");
    // Retirer un agent ≠ coordinateur → OK (gandalf n'est plus coord).
    await act(async () => {
      await result.current.removeAgent(id, "gandalf");
    });
    expect(
      result.current.teams[0].agents.some((a) => a.id === "gandalf"),
    ).toBe(false);
  });

  it("A4 garde : retirer le coordinateur courant est REFUSÉ", async () => {
    const { result } = await mounted(makeApi());
    const team = result.current.teams[0];
    expect(team.coordinator).toBe("aragorn");
    await act(async () => {
      await result.current.removeAgent(team.id, "aragorn");
    });
    expect(
      result.current.teams[0].agents.some((a) => a.id === "aragorn"),
    ).toBe(true);
  });

  it("A4 garde : setCoordinator vers un agent inexistant est REFUSÉ", async () => {
    const { result } = await mounted(makeApi());
    const id = result.current.teams[0].id;
    await act(async () => {
      await result.current.setCoordinator(id, "fantome");
    });
    expect(result.current.teams[0].coordinator).toBe("aragorn");
  });

  it("A4 garde : retirer la dernière team / la team par défaut est REFUSÉ", async () => {
    const { result } = await mounted(makeApi());
    await act(async () => {
      await result.current.removeTeam(DEFAULT_TEAM_ID);
    });
    // Suppression de la team par défaut refusée (iakaframe reste présente).
    expect(result.current.teams.some((t) => t.id === DEFAULT_TEAM_ID)).toBe(true);
    // Avec 2 teams, supprimer la team par défaut reste refusé ; une autre est OK.
    const other: Team = { ...defaultTeamFromDemo("lotr"), id: "x2", name: "X2" };
    await act(async () => {
      await result.current.upsertTeam(other);
    });
    await act(async () => {
      await result.current.removeTeam(DEFAULT_TEAM_ID);
    });
    expect(result.current.teams.some((t) => t.id === DEFAULT_TEAM_ID)).toBe(true);
    await act(async () => {
      await result.current.removeTeam("x2");
    });
    expect(result.current.teams.some((t) => t.id === "x2")).toBe(false);
  });

  it("A5 : le JSON `teams` persisté ne contient aucun champ secret", async () => {
    const api = makeApi();
    const { result } = await mounted(api);
    await act(async () => {
      await result.current.upsertAgent(
        result.current.teams[0].id,
        AGENT({ model: "llama3.1:8b", skills: ["iakaframe-gimli"] }),
      );
    });
    const calls = (api.configSet as ReturnType<typeof vi.fn>).mock.calls;
    const teamsCalls = calls.filter((c) => c[0] === TEAMS_KEYS.teams);
    const lastTeams = teamsCalls[teamsCalls.length - 1];
    const json = (lastTeams?.[1] as string).toLowerCase();
    for (const bad of ["token", "secret", "password", "apikey", "api_key"]) {
      expect(json).not.toContain(bad);
    }
  });
});

describe("useTeams — liaison projet", () => {
  it("bindProjectTeam : écrit project_team:<id> ET default_team, maj état", async () => {
    const api = makeApi();
    const { result } = await mounted(api);
    await act(async () => {
      await result.current.bindProjectTeam("projZ", DEFAULT_TEAM_ID);
    });
    expect(api.configSet).toHaveBeenCalledWith(
      `${TEAMS_KEYS.projectTeamPrefix}projZ`,
      DEFAULT_TEAM_ID,
    );
    expect(api.configSet).toHaveBeenCalledWith(
      TEAMS_KEYS.defaultTeam,
      DEFAULT_TEAM_ID,
    );
    expect(result.current.hasBinding("projZ")).toBe(true);
    expect(result.current.defaultTeamId).toBe(DEFAULT_TEAM_ID);
  });
});
