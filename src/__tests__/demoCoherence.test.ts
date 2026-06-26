import { describe, it, expect } from "vitest";
// Import du script bash en TEXTE BRUT via Vite (`?raw`) — pas de dépendance
// `@types/node` ni d'accès `fs` (typé via vite/client).
import COUCH_SH from "../../docker/init-couchdb.sh?raw";
import {
  DEMO_HISTORY_AGENTS,
  GANDALF_REPORT_VERBATIM,
} from "../mock/demoConversation";

/**
 * C4 — COHÉRENCE chat (L8, src/mock/demoConversation.ts) ↔ main courante
 * (L4, docker/init-couchdb.sh). La même scène (mêmes agents, délégation /
 * rapport / verbatim) doit se retrouver des deux côtés.
 */

describe("cohérence démo chat ↔ main courante (L9-C4)", () => {
  it("le script CouchDB seede bien la conversation iaka-demo", () => {
    expect(COUCH_SH).toContain('conv_id\\":\\"iaka-demo');
  });

  it("les paires (royaume,agent) du chat verbatim sont présentes dans les logs", () => {
    for (const { royaume, agent } of DEMO_HISTORY_AGENTS) {
      expect(COUCH_SH).toContain(`royaume\\":\\"${royaume}`);
      expect(COUCH_SH).toContain(`agent\\":\\"${agent}`);
    }
  });

  it("la délégation Aragorn→Gandalf est portée par le canal geste", () => {
    expect(COUCH_SH).toContain('canal\\":\\"geste');
    expect(COUCH_SH).toContain('to\\":\\"Gandalf');
  });

  it("les logs contiennent un rapport ET une restitution verbatim", () => {
    expect(COUCH_SH).toContain('kind\\":\\"rapport');
    expect(COUCH_SH).toContain('kind\\":\\"verbatim');
  });

  it("le texte du rapport est cohérent entre chat et logs (mots-clés communs)", () => {
    // Le texte des logs est ASCII (sans accents) ; on ancre sur des jalons stables.
    expect(GANDALF_REPORT_VERBATIM).toContain("3 teams");
    expect(COUCH_SH).toContain("3 teams");
    expect(GANDALF_REPORT_VERBATIM.toLowerCase()).toContain("lotr, avengers, starfleet");
    expect(COUCH_SH).toContain("lotr, avengers, starfleet");
  });

  it("les docs demo-1 historiques restent (non-régression L4)", () => {
    expect(COUCH_SH).toContain('conv_id\\":\\"demo-1');
  });
});
