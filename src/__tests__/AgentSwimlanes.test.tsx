import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
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
});
