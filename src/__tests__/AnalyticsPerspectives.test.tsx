import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "../i18n";
import { AnalyticsView } from "../views/AnalyticsView";
import { PerspectiveDashboard } from "../components/analytics/PerspectiveDashboard";
import { PerspectiveTimeline } from "../components/analytics/PerspectiveTimeline";
import { PerspectiveCompare } from "../components/analytics/PerspectiveCompare";
import { PerspectiveAgents } from "../components/analytics/PerspectiveAgents";
import { makeDemoAnalytics } from "../mock/demoAnalytics";
import { deriveAnalytics, rangeFromPreset, ALL_SCOPE } from "../hooks/useAnalytics";

const NOW = new Date(2026, 6, 13, 12, 0, 0).getTime();
const demo = makeDemoAnalytics(NOW, rangeFromPreset("7d", NOW));
const empty = deriveAnalytics([], [], ALL_SCOPE, rangeFromPreset("7d", Date.now()));

describe("Perspectives — démo pleine (widgets clés présents)", () => {
  it("V1 Dashboard : KPI tokens + treemap agents + top délégations", () => {
    render(<PerspectiveDashboard model={demo} />);
    expect(screen.getByText("3,87 M")).toBeTruthy(); // KPI tokens
    expect(screen.getByText("$11,64")).toBeTruthy(); // KPI coût (démo)
    expect(screen.getAllByText("Aragorn").length).toBeGreaterThan(0); // treemap
    expect(screen.getByText(/iakacockpit · refacto/)).toBeTruthy(); // top délégations
  });

  it("V2 Timeline : callout de variation + coût cumulé", () => {
    render(<PerspectiveTimeline model={demo} />);
    expect(screen.getByText(/Variation détectée/)).toBeTruthy();
    expect(screen.getByText(/Coût cumulé/)).toBeTruthy();
  });

  it("V3 Comparaison : configs A/B + verdict, et scénario hypothèse étiqueté", () => {
    render(<PerspectiveCompare model={demo} />);
    expect(screen.getByText("Config A")).toBeTruthy();
    expect(screen.getByText("Config B")).toBeTruthy();
    expect(screen.getByText(/plus efficiente/)).toBeTruthy(); // verdict
    // Bascule sur le scénario hypothèse → étiquette d'honnêteté TOUJOURS présente.
    fireEvent.click(screen.getByRole("tab", { name: /Constaté vs hypothèse/ }));
    expect(screen.getByText("hypothèse · à volume constant")).toBeTruthy();
  });

  it("V4 Par agent : classement + fiche dépliée + mix runner", () => {
    render(<PerspectiveAgents model={demo} />);
    expect(screen.getByText("Classement des agents")).toBeTruthy();
    expect(screen.getByText("Mix par runner")).toBeTruthy();
    expect(screen.getAllByText("Gimli").length).toBeGreaterThan(0);
  });
});

describe("Perspectives — prod sans source réelle (placeholder honnête)", () => {
  it("V1 Dashboard vide : widgets non couverts rendent « Donnée à venir »", () => {
    render(<PerspectiveDashboard model={empty} />);
    expect(screen.getAllByText("Donnée à venir").length).toBeGreaterThan(0);
  });

  it("V3 Comparaison vide : placeholder (pas de config inventée)", () => {
    render(<PerspectiveCompare model={empty} />);
    expect(screen.getByText("Donnée à venir")).toBeTruthy();
    expect(screen.queryByText("Config A")).toBeNull();
  });

  it("V4 vide : placeholder (pas d'agent inventé)", () => {
    render(<PerspectiveAgents model={empty} />);
    expect(screen.getByText("Donnée à venir")).toBeTruthy();
    expect(screen.queryByText("Classement des agents")).toBeTruthy();
  });
});

describe("AnalyticsView — toggle de perspective", () => {
  it("commute V1→V2→V3→V4 (démo dev-gardée substituée, données réelles absentes)", () => {
    render(<AnalyticsView economy={[]} activity={[]} demoOn />);
    // Défaut = V1 Dashboard.
    expect(screen.getByText(/Tokens par agent/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "V2 · Timeline" }));
    expect(screen.getByText(/Évolution des tokens/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "V3 · Comparaison" }));
    expect(screen.getByText("Config A")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "V4 · Par agent" }));
    expect(screen.getByText("Classement des agents")).toBeTruthy();
  });

  it("dev avec réel PARTIEL : réel là où dispo + démo pour combler (page pleine)", () => {
    // Un vrai projet (périmètre) + une activité RÉELLE dans la fenêtre 7j → KPI tokens réel.
    const economy = [{ project: "iakacockpit", tokens: 250_000, segments: [] }];
    // Jour d'activité récent (il y a 2 jours) → dans la plage 7j par défaut.
    const d = new Date(Date.now() - 2 * 86_400_000);
    const p = (n: number): string => String(n).padStart(2, "0");
    const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const activity = [{ project: "iakacockpit", days: [{ date: day, tokens: 250_000 }] }];
    render(<AnalyticsView economy={economy} activity={activity} demoOn />);
    // Tokens = RÉEL de la fenêtre (250 k, périmètre + KPI), pas la démo (3,87 M).
    expect(screen.getAllByText("250 k").length).toBeGreaterThan(0);
    expect(screen.queryByText("3,87 M")).toBeNull();
    // Coût non couvert par le réel → COMBLÉ par la démo (plus de placeholder ici).
    expect(screen.getByText("$11,64")).toBeTruthy();
    // Périmètre = réel (le projet réel apparaît).
    expect(screen.getAllByText("iakacockpit").length).toBeGreaterThan(0);
  });

  it("prod sans démo : la page rend le placeholder (aucun chiffre inventé)", () => {
    render(<AnalyticsView economy={[]} activity={[]} demoOn={false} />);
    // Titre présent + placeholders honnêtes, pas de KPI démo.
    expect(
      screen.getByRole("heading", { name: "Performance de l'équipe" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Donnée à venir").length).toBeGreaterThan(0);
    expect(screen.queryByText("$11,64")).toBeNull();
  });

  it("changer de plage fait bouger les widgets (nb de buckets jour : 7j→30j)", () => {
    const { container } = render(
      <AnalyticsView economy={[]} activity={[]} demoOn />,
    );
    // Défaut 7 j → 7 colonnes de barres jour (V1 Dashboard).
    expect(container.querySelectorAll(".abars .col")).toHaveLength(7);
    fireEvent.click(screen.getByRole("tab", { name: "30 j" }));
    expect(container.querySelectorAll(".abars .col")).toHaveLength(30);
    fireEvent.click(screen.getByRole("tab", { name: "24 h" }));
    expect(container.querySelectorAll(".abars .col")).toHaveLength(1);
  });

  it("Custom ouvre deux sélecteurs de date et modifier une date rebâtit la plage", () => {
    render(<AnalyticsView economy={[]} activity={[]} demoOn />);
    // Pas de sélecteur de date hors Custom.
    expect(screen.queryByLabelText("Date de début")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Custom" }));
    const from = screen.getByLabelText("Date de début") as HTMLInputElement;
    const to = screen.getByLabelText("Date de fin") as HTMLInputElement;
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    // Restreindre la borne de début à 5 jours avant la fin → la série jour passe à 5 buckets.
    const toMs = new Date(to.value).getTime();
    const newFrom = new Date(toMs - 5 * 86_400_000).toISOString().slice(0, 10);
    fireEvent.change(from, { target: { value: newFrom } });
    expect(document.querySelectorAll(".abars .col").length).toBe(5);
  });

  it("sélectionner un projet du périmètre change la pastille de scope", () => {
    const { container } = render(
      <AnalyticsView economy={[]} activity={[]} demoOn />,
    );
    const col = container.querySelector(".projcol")!;
    fireEvent.click(within(col as HTMLElement).getByText("iakagraph"));
    expect(screen.getByText("iakagraph", { selector: ".scopepill" })).toBeTruthy();
  });
});
