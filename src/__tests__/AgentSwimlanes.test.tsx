import { describe, it, expect, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  within,
  fireEvent,
} from "@testing-library/react";
import { AgentSwimlanes } from "../components/AgentSwimlanes";
import type { AgentTask } from "../hooks/useAgentTasks";

afterEach(cleanup);

const task = (over: Partial<AgentTask> & { id: string }): AgentTask => ({
  agent: "gandalf",
  description: "Cadrer la feature",
  status: "running",
  ts: "2026-06-27T10:00:00Z",
  ...over,
});

describe("AgentSwimlanes — arbre horizontal / variante B (L29)", () => {
  it("vide → placeholder honnête (pas de couloir, pas de compteur)", () => {
    const { container } = render(
      <AgentSwimlanes coordinator="Aragorn" tasks={[]} />,
    );
    expect(screen.getByText("Aucune délégation.")).toBeTruthy();
    expect(screen.getByLabelText("Couloirs d'agents (délégations)")).toBeTruthy();
    // Pas de barre ni de couloir rendus.
    expect(container.querySelector(".swimbar")).toBeNull();
    expect(container.querySelector(".swimscroll")).toBeNull();
  });

  it("un couloir par agent : coordinateur en tête + délégués dédupliqués (ordre stable)", () => {
    const { container } = render(
      <AgentSwimlanes
        coordinator="aragorn"
        tasks={[
          task({ id: "t1", agent: "gandalf", ts: "2026-06-27T10:00:00Z" }),
          task({ id: "t2", agent: "gimli", ts: "2026-06-27T10:05:00Z" }),
          // Doublon (même agent, casse différente) → PAS de couloir supplémentaire.
          task({ id: "t3", agent: "Gandalf", ts: "2026-06-27T10:08:00Z" }),
        ]}
      />,
    );
    const labels = Array.from(
      container.querySelectorAll(".swimlab"),
    ).map((n) => n.textContent);
    // Coordinateur en tête, puis délégués dans l'ordre de 1re apparition, dédupliqués.
    expect(labels).toEqual(["Aragorn", "Gandalf", "Gimli"]);
  });

  it("une barre par tâche, colorée par statut (running ambre / done vert)", () => {
    const { container } = render(
      <AgentSwimlanes
        coordinator="Aragorn"
        tasks={[
          task({ id: "t1", agent: "gimli", status: "running" }),
          task({
            id: "t2",
            agent: "legolas",
            status: "done",
            ts: "2026-06-27T10:00:00Z",
            doneTs: "2026-06-27T10:10:00Z",
          }),
        ]}
      />,
    );
    const bars = container.querySelectorAll(".swimbar");
    expect(bars).toHaveLength(2);
    expect(bars[0].classList.contains("running")).toBe(true);
    expect(bars[1].classList.contains("done")).toBe(true);
  });

  it("barre running = ouverte (largeur positive) même si c'est la délégation la plus récente", () => {
    const { container } = render(
      <AgentSwimlanes
        coordinator="Aragorn"
        tasks={[task({ id: "t1", agent: "gimli", status: "running" })]}
      />,
    );
    const bar = container.querySelector(".swimbar.running") as SVGRectElement;
    expect(bar).not.toBeNull();
    // Barre ouverte jusqu'à « maintenant » → largeur strictement positive.
    expect(Number(bar.getAttribute("width"))).toBeGreaterThan(0);
  });

  it("flèche de délégation coordinateur → délégué (pas pour le couloir coordinateur)", () => {
    const { container } = render(
      <AgentSwimlanes
        coordinator="aragorn"
        tasks={[
          task({ id: "t1", agent: "gandalf" }),
          task({ id: "t2", agent: "gimli", ts: "2026-06-27T10:05:00Z" }),
        ]}
      />,
    );
    // Deux délégations → deux flèches (une par délégué).
    expect(container.querySelectorAll(".swimarr")).toHaveLength(2);
    expect(container.querySelector(".swimarrline")).not.toBeNull();
    expect(container.querySelector(".swimarrhead")).not.toBeNull();
  });

  it("pas de flèche pour une tâche sans ts (zéro fausse donnée)", () => {
    const { container } = render(
      <AgentSwimlanes
        coordinator="Aragorn"
        tasks={[task({ id: "t1", agent: "gimli", ts: undefined })]}
      />,
    );
    // Sans horodatage : ni flèche ni barre (pas d'estimation inventée).
    expect(container.querySelector(".swimarr")).toBeNull();
    expect(container.querySelector(".swimbar")).toBeNull();
  });

  it("vignette d'agent quand resolveAvatar renvoie une URL, fallback pastille sinon", () => {
    const { container } = render(
      <AgentSwimlanes
        coordinator="aragorn"
        tasks={[task({ id: "t1", agent: "gandalf" })]}
        resolveAvatar={(a) => (a.toLowerCase() === "gandalf" ? `/assets/g.png` : null)}
      />,
    );
    // Gandalf a une vignette (SVG <image>), Aragorn (null) retombe sur une pastille.
    expect(container.querySelector("image")).not.toBeNull();
    expect(container.querySelector(".swimav.ph")).not.toBeNull();
  });

  it("compteur = nombre de délégations", () => {
    render(
      <AgentSwimlanes
        coordinator="Aragorn"
        tasks={[
          task({ id: "t1", agent: "gimli" }),
          task({ id: "t2", agent: "legolas" }),
        ]}
      />,
    );
    const band = screen.getByLabelText("Couloirs d'agents (délégations)");
    expect(within(band).getByText(/2 délégation/)).toBeTruthy();
  });

  // --- R1 : labels d'agents FIGÉS hors de la zone scrollable. ---
  it("R1 — les labels d'agents sont rendus HORS du conteneur scrollable (colonne figée)", () => {
    const { container } = render(
      <AgentSwimlanes
        coordinator="aragorn"
        tasks={[task({ id: "t1", agent: "gandalf" })]}
      />,
    );
    // Les labels vivent dans la colonne figée `.swimlabels`, jamais dans `.swimscroll`.
    expect(container.querySelector(".swimlabels .swimlab")).not.toBeNull();
    expect(container.querySelector(".swimscroll .swimlab")).toBeNull();
    // La colonne figée est un frère (pas un descendant) de la zone scrollable.
    const labels = container.querySelector(".swimlabels");
    expect(labels?.closest(".swimscroll")).toBeNull();
    // Toujours présents : coordinateur + délégué.
    const names = Array.from(
      container.querySelectorAll(".swimlabels .swimlab"),
    ).map((n) => n.textContent);
    expect(names).toEqual(["Aragorn", "Gandalf"]);
  });

  // --- R2 : repères d'heure (gridlines + labels) toujours présents. ---
  it("R2 — gridlines verticales + labels d'heure dans la scène (au moins 2 ticks)", () => {
    const { container } = render(
      <AgentSwimlanes
        coordinator="Aragorn"
        tasks={[
          task({
            id: "t1",
            agent: "gimli",
            status: "done",
            ts: "2026-06-27T10:00:00Z",
            doneTs: "2026-06-27T10:40:00Z",
          }),
        ]}
      />,
    );
    const grid = container.querySelectorAll(".swimscene .swimgrid");
    const axLabels = container.querySelectorAll(".swimscene .swimax");
    expect(grid.length).toBeGreaterThanOrEqual(2);
    // Un label d'heure par gridline, au format HH:MM.
    expect(axLabels.length).toBe(grid.length);
    expect(axLabels[0].textContent).toMatch(/^\d{2}:\d{2}$/);
  });

  it("R2 — la densité de ticks AUGMENTE au zoom (plus de repères quand on zoome)", () => {
    const spanTasks = [
      task({
        id: "t1",
        agent: "gimli",
        status: "done",
        ts: "2026-06-27T10:00:00Z",
        doneTs: "2026-06-27T11:00:00Z",
      }),
    ];
    const { container } = render(
      <AgentSwimlanes coordinator="Aragorn" tasks={spanTasks} />,
    );
    const before = container.querySelectorAll(".swimscene .swimgrid").length;
    fireEvent.click(screen.getByLabelText("Zoomer l'axe du temps"));
    fireEvent.click(screen.getByLabelText("Zoomer l'axe du temps"));
    const after = container.querySelectorAll(".swimscene .swimgrid").length;
    expect(after).toBeGreaterThan(before);
  });

  // --- R3 : zoom +/- change l'échelle px/minute, borné. ---
  it("R3 — `+` augmente l'échelle (px/min + largeur), `−` la diminue", () => {
    const { container } = render(
      <AgentSwimlanes
        coordinator="Aragorn"
        tasks={[
          task({
            id: "t1",
            agent: "gimli",
            status: "done",
            ts: "2026-06-27T10:00:00Z",
            doneTs: "2026-06-27T11:00:00Z",
          }),
        ]}
      />,
    );
    const scene = (): SVGSVGElement =>
      container.querySelector(".swimscene") as SVGSVGElement;
    const pxMin = (): number => Number(scene().getAttribute("data-px-min"));
    const width = (): number => Number(scene().getAttribute("width"));

    const base = pxMin();
    const baseW = width();
    fireEvent.click(screen.getByLabelText("Zoomer l'axe du temps"));
    expect(pxMin()).toBeGreaterThan(base);
    expect(width()).toBeGreaterThan(baseW);

    fireEvent.click(screen.getByLabelText("Dézoomer l'axe du temps"));
    fireEvent.click(screen.getByLabelText("Dézoomer l'axe du temps"));
    expect(pxMin()).toBeLessThan(base);
  });

  it("R3 — l'échelle est bornée (plancher ÷4 / plafond ×4)", () => {
    render(
      <AgentSwimlanes
        coordinator="Aragorn"
        tasks={[task({ id: "t1", agent: "gimli" })]}
      />,
    );
    const zin = screen.getByLabelText("Zoomer l'axe du temps");
    const zout = screen.getByLabelText("Dézoomer l'axe du temps");
    // Plafond : cliquer + jusqu'à saturation → bouton + désactivé.
    for (let i = 0; i < 8; i++) fireEvent.click(zin);
    expect((zin as HTMLButtonElement).disabled).toBe(true);
    // Plancher : cliquer − jusqu'à saturation → bouton − désactivé.
    for (let i = 0; i < 12; i++) fireEvent.click(zout);
    expect((zout as HTMLButtonElement).disabled).toBe(true);
  });
});
