import { describe, it, expect } from "vitest";
import { deriveDelegationsFromFeed } from "../hooks/deriveDelegations";
import type { FeedEvent } from "../api/backend";

const ev = (over: Partial<FeedEvent> & { id: string }): FeedEvent => ({
  canal: "geste",
  who: "Gimli",
  project: "IakaCockpit",
  body: "feat(L28): arbre des délégations",
  ts: "10:40",
  ...over,
});

describe("deriveDelegationsFromFeed — feed L4 → délégations (L28/F3)", () => {
  it("ne garde que le canal geste ; une délégation par événement", () => {
    const out = deriveDelegationsFromFeed([
      ev({ id: "g1", canal: "geste", who: "Gimli" }),
      ev({ id: "a1", canal: "adresse", who: "Stéphane" }),
      ev({ id: "p1", canal: "pensee", who: "Gandalf" }),
      ev({ id: "ag1", canal: "agent", who: "Aragorn → Gimli" }),
      ev({ id: "g2", canal: "geste", who: "Legolas" }),
    ]);
    expect(out.map((t) => t.id)).toEqual(["g1", "g2"]);
    expect(out[0].agent).toBe("Gimli");
    expect(out[1].agent).toBe("Legolas");
  });

  it("extrait l'agent cible d'un `A → B` (dernier segment)", () => {
    const out = deriveDelegationsFromFeed([
      ev({ id: "g1", canal: "geste", who: "Aragorn → Gimli" }),
    ]);
    expect(out[0].agent).toBe("Gimli");
  });

  it("body → description, ts conservé", () => {
    const out = deriveDelegationsFromFeed([
      ev({ id: "g1", body: "commit atomique", ts: "09:12" }),
    ]);
    expect(out[0].description).toBe("commit atomique");
    expect(out[0].ts).toBe("09:12");
  });

  it("ZÉRO fausse donnée : sans signal de fin, statut reste `running`", () => {
    const out = deriveDelegationsFromFeed([
      ev({ id: "g1", meta: null }),
      ev({ id: "g2", meta: { foo: "bar" } }),
      ev({ id: "g3" }),
    ]);
    expect(out.every((t) => t.status === "running")).toBe(true);
  });

  it("statut `done` UNIQUEMENT si déductible d'un signal meta explicite", () => {
    const out = deriveDelegationsFromFeed([
      ev({ id: "g1", meta: { status: "done" } }),
      ev({ id: "g2", meta: { state: "completed" } }),
      ev({ id: "g3", meta: { event: "report" } }),
      ev({ id: "g4", meta: { status: "running" } }),
    ]);
    expect(out.find((t) => t.id === "g1")?.status).toBe("done");
    expect(out.find((t) => t.id === "g2")?.status).toBe("done");
    expect(out.find((t) => t.id === "g3")?.status).toBe("done");
    expect(out.find((t) => t.id === "g4")?.status).toBe("running");
  });

  it("feed vide → aucune délégation", () => {
    expect(deriveDelegationsFromFeed([])).toEqual([]);
  });
});
