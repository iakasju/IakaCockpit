import { describe, it, expect } from "vitest";
import { URGENCY_HIGH, urgencyLabel, urgencyLevel } from "../components/urgency";

describe("urgency — mapping partagé liste ↔ tuile (L16-F4-bis)", () => {
  it("null → none (pas de backlog, gris/neutre)", () => {
    expect(urgencyLevel(null)).toBe("none");
  });

  it("0 → done (backlog présent, tout coché)", () => {
    expect(urgencyLevel(0)).toBe("done");
  });

  it("1..N-1 → mid (en cours)", () => {
    expect(urgencyLevel(1)).toBe("mid");
    expect(urgencyLevel(4)).toBe("mid");
  });

  it(">= N → high (urgent), seuil = URGENCY_HIGH", () => {
    expect(URGENCY_HIGH).toBe(5);
    expect(urgencyLevel(5)).toBe("high");
    expect(urgencyLevel(12)).toBe("high");
  });

  it("libellé i18n : bonne clé + interpolation {{count}} selon le niveau", () => {
    // Fonction de traduction factice qui renvoie clé + count (vérifie le câblage sans i18n réel).
    const t = (key: string, opts?: Record<string, unknown>) =>
      opts && "count" in opts ? `${key}:${opts.count}` : key;
    expect(urgencyLabel("high", 7, t)).toBe("card.urgencyHigh:7");
    expect(urgencyLabel("mid", 3, t)).toBe("card.urgencyMid:3");
    expect(urgencyLabel("done", 0, t)).toBe("card.urgencyDone");
    expect(urgencyLabel("none", null, t)).toBe("card.urgencyNone");
  });

  it("libellé high/mid : count null → 0 (jamais « undefined »)", () => {
    const t = (key: string, opts?: Record<string, unknown>) =>
      opts && "count" in opts ? `${key}:${opts.count}` : key;
    expect(urgencyLabel("high", null, t)).toBe("card.urgencyHigh:0");
  });
});
