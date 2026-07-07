import { describe, it, expect } from "vitest";
import {
  parseForgeTeam,
  parseManifest,
  forgeTeamToCockpit,
  buildProvenance,
  detectConflict,
  serializeProvenance,
  parseProvenance,
  type HandoffManifest,
  type HandoffProvenance,
} from "../handoff/receive";

/** team.json PURE tel que la forge le sérialise (`@iakaframe/core`, aucun runner/model). */
const FORGE_TEAM_JSON = JSON.stringify({
  id: "iakaframe",
  name: "iakaframe",
  methodId: "iakaframe",
  vignetteTeam: "none",
  coordinator: "aragorn",
  personas: [
    {
      id: "aragorn",
      name: "Aragorn",
      roleKey: "coordination",
      royaume: "COORDINATION",
      roleIndex: 1,
      skills: ["iakaframe-cadrage"],
      guardrails: ["identity-badge"],
    },
    {
      id: "gimli",
      name: "Gimli",
      roleKey: "fabrication",
      royaume: "FABRICATION",
      roleIndex: 3,
      skills: [],
      guardrails: [],
    },
  ],
  connectors: ["mcp-forgejo"],
  workflowId: "iakaframe-canonical",
});

const MANIFEST_JSON = JSON.stringify({
  source: "forge",
  teamId: "iakaframe",
  teamName: "iakaframe",
  version: "abcd1234",
  timestamp: "2026-07-07T10:00:00.000Z",
  originHash: "abcd1234",
});

describe("parseForgeTeam (défensif)", () => {
  it("parse la forme forge PURE", () => {
    const t = parseForgeTeam(FORGE_TEAM_JSON);
    expect(t).not.toBeNull();
    expect(t!.id).toBe("iakaframe");
    expect(t!.personas).toHaveLength(2);
    expect(t!.coordinator).toBe("aragorn");
    expect(t!.workflowId).toBe("iakaframe-canonical");
    expect(t!.connectors).toEqual(["mcp-forgejo"]);
  });

  it("rejette un JSON invalide / sans id", () => {
    expect(parseForgeTeam("pas du json")).toBeNull();
    expect(parseForgeTeam(JSON.stringify({ name: "x" }))).toBeNull();
    expect(parseForgeTeam(null)).toBeNull();
  });

  it("replie un coordinator invalide sur personas[0]", () => {
    const t = parseForgeTeam(
      JSON.stringify({ id: "t", coordinator: "inconnu", personas: [{ id: "g", name: "G" }] }),
    );
    expect(t!.coordinator).toBe("g");
  });

  it("ignore les personas invalides", () => {
    const t = parseForgeTeam(
      JSON.stringify({ id: "t", personas: [{ name: "Ok" }, {}, 3, null] }),
    );
    expect(t!.personas).toHaveLength(1);
    expect(t!.personas[0].name).toBe("Ok");
  });
});

describe("parseManifest (défensif)", () => {
  it("parse un manifeste valide", () => {
    const m = parseManifest(MANIFEST_JSON);
    expect(m!.source).toBe("forge");
    expect(m!.originHash).toBe("abcd1234");
  });

  it("rejette un manifeste sans empreinte", () => {
    expect(parseManifest(JSON.stringify({ source: "forge", teamId: "x" }))).toBeNull();
    expect(parseManifest(null)).toBeNull();
  });
});

describe("forgeTeamToCockpit (mapping)", () => {
  it("mappe personas→agents avec défaut runner/modèle cockpit (team forge PURE)", () => {
    const t = forgeTeamToCockpit(parseForgeTeam(FORGE_TEAM_JSON)!);
    expect(t.id).toBe("iakaframe");
    expect(t.vignetteTeam).toBe("none");
    expect(t.coordinator).toBe("aragorn");
    expect(t.agents).toHaveLength(2);
    const aragorn = t.agents[0];
    expect(aragorn.runner).toBe("claude-code"); // défaut cockpit
    expect(aragorn.model).toBe(""); // défaut cockpit
    expect(aragorn.royaume).toBe("COORDINATION");
    expect(aragorn.roleIndex).toBe(1);
    expect(aragorn.skills).toEqual(["iakaframe-cadrage"]);
  });
});

describe("provenance + anti-dérive", () => {
  const manifest: HandoffManifest = parseManifest(MANIFEST_JSON)!;

  it("buildProvenance conserve le team.json d'origine et démarre localEdits=false", () => {
    const p = buildProvenance(manifest, "2026-07-07T11:00:00.000Z", FORGE_TEAM_JSON);
    expect(p.localEdits).toBe(false);
    expect(p.originHash).toBe("abcd1234");
    expect(p.importedAt).toBe("2026-07-07T11:00:00.000Z");
    expect(p.originTeamJson).toBe(FORGE_TEAM_JSON); // passthrough des champs additifs
    // Les champs additifs forge (roleKey/guardrails/methodId/connectors) restent relisibles.
    expect(p.originTeamJson).toContain("guardrails");
    expect(p.originTeamJson).toContain("methodId");
  });

  it("aucun conflit sans provenance ni édition locale", () => {
    expect(detectConflict(null, "abcd1234")).toBe(false);
    const clean = buildProvenance(manifest, "t", FORGE_TEAM_JSON);
    expect(detectConflict(clean, "zzzz9999")).toBe(false);
  });

  it("CONFLIT si édition locale ET empreinte changée", () => {
    const edited: HandoffProvenance = {
      ...buildProvenance(manifest, "t", FORGE_TEAM_JSON),
      localEdits: true,
    };
    expect(detectConflict(edited, "zzzz9999")).toBe(true); // nouvelle livraison
    expect(detectConflict(edited, "abcd1234")).toBe(false); // même empreinte = pas de conflit
  });

  it("provenance round-trip (serialize/parse)", () => {
    const p = buildProvenance(manifest, "t", FORGE_TEAM_JSON);
    const back = parseProvenance(serializeProvenance(p));
    expect(back).toEqual(p);
  });
});
