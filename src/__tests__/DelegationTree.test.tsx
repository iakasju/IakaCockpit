import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { DelegationTree } from "../components/DelegationTree";
import type { AgentTask } from "../hooks/useAgentTasks";

afterEach(cleanup);

const task = (over: Partial<AgentTask> & { id: string }): AgentTask => ({
  agent: "gandalf",
  description: "Cadrer la feature",
  status: "running",
  ...over,
});

describe("DelegationTree — arbre des délégations (L28)", () => {
  it("vide → placeholder honnête, pas de compteur", () => {
    render(<DelegationTree coordinator="Aragorn" tasks={[]} />);
    expect(screen.getByText("Aucune délégation.")).toBeTruthy();
    expect(screen.getByLabelText("Arbre des délégations")).toBeTruthy();
    // Racine non rendue quand aucune délégation.
    expect(screen.queryByText("coordinateur")).toBeNull();
  });

  it("racine = coordinateur (nom capitalisé + rôle) → enfants = agents délégués", () => {
    render(
      <DelegationTree
        coordinator="aragorn"
        tasks={[
          task({ id: "t1", agent: "gandalf", description: "Cadrer L28" }),
          task({ id: "t2", agent: "gimli", description: "Coder l'arbre" }),
        ]}
      />,
    );
    // Racine : coordinateur capitalisé + tag rôle.
    expect(screen.getByText("Aragorn")).toBeTruthy();
    expect(screen.getByText("coordinateur")).toBeTruthy();
    // Enfants : un nœud par délégation.
    expect(screen.getByText("Gandalf")).toBeTruthy();
    expect(screen.getByText("Cadrer L28")).toBeTruthy();
    expect(screen.getByText("Gimli")).toBeTruthy();
    expect(screen.getByText("Coder l'arbre")).toBeTruthy();
  });

  it("couleur par statut : running (classe running) vs done (classe done + ✓)", () => {
    const { container } = render(
      <DelegationTree
        coordinator="Aragorn"
        tasks={[
          task({ id: "t1", agent: "gimli", status: "running" }),
          task({ id: "t2", agent: "legolas", status: "done" }),
        ]}
      />,
    );
    const nodes = container.querySelectorAll(".dtnode");
    expect(nodes).toHaveLength(2);
    expect(nodes[0].classList.contains("running")).toBe(true);
    expect(nodes[1].classList.contains("done")).toBe(true);
    // Statut : title « en cours » et « terminé » ; ✓ seulement sur le done.
    expect(screen.getByTitle("en cours")).toBeTruthy();
    const done = within(nodes[1] as HTMLElement);
    expect(done.getByTitle("terminé").textContent).toBe("✓");
  });

  it("compteur : N délégations + N en cours (running seulement)", () => {
    render(
      <DelegationTree
        coordinator="Aragorn"
        tasks={[
          task({ id: "t1", status: "running" }),
          task({ id: "t2", agent: "gimli", status: "running" }),
          task({ id: "t3", agent: "legolas", status: "done" }),
        ]}
      />,
    );
    // 3 délégations dont 2 en cours.
    expect(screen.getByText(/3 délégation/)).toBeTruthy();
    expect(screen.getByText(/2 en cours/)).toBeTruthy();
  });

  it("vignette d'agent quand resolveAvatar renvoie une URL (alt = nom)", () => {
    render(
      <DelegationTree
        coordinator="aragorn"
        tasks={[task({ id: "t1", agent: "gandalf" })]}
        resolveAvatar={(a) => `/assets/${a.toLowerCase()}.png`}
      />,
    );
    // Racine + enfant portent chacun une vignette.
    expect(screen.getByAltText("Aragorn")).toBeTruthy();
    expect(screen.getByAltText("Gandalf")).toBeTruthy();
  });

  it("fallback : resolveAvatar absent → pas d'image, initiales conservées", () => {
    render(
      <DelegationTree
        coordinator="Aragorn"
        tasks={[task({ id: "t1", agent: "gandalf" })]}
      />,
    );
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("Aragorn")).toBeTruthy();
    expect(screen.getByText("Gandalf")).toBeTruthy();
  });
});
