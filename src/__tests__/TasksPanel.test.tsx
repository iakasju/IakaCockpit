import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TasksPanel } from "../components/TasksPanel";
import type { AgentTask } from "../hooks/useAgentTasks";

afterEach(cleanup);

const task = (over: Partial<AgentTask> & { id: string }): AgentTask => ({
  agent: "gandalf",
  description: "Cadrer la feature",
  status: "running",
  ...over,
});

describe("TasksPanel — panneau « Tâches en cours » (Working/droite)", () => {
  it("état vide i18n quand aucune tâche", () => {
    render(<TasksPanel tasks={[]} />);
    // Libellé FR (setup global = fr).
    expect(screen.getByText("Aucune tâche en cours")).toBeTruthy();
    expect(screen.getByLabelText("Tâches en cours")).toBeTruthy();
  });

  it("liste les tâches : nom d'agent capitalisé + description", () => {
    render(
      <TasksPanel
        tasks={[
          task({ id: "t1", agent: "gandalf", description: "Cadrer L12" }),
          task({ id: "t2", agent: "legolas", description: "Valider le gate", status: "done" }),
        ]}
      />,
    );
    expect(screen.getByText("Gandalf")).toBeTruthy();
    expect(screen.getByText("Cadrer L12")).toBeTruthy();
    expect(screen.getByText("Legolas")).toBeTruthy();
    expect(screen.getByText("Valider le gate")).toBeTruthy();
    // Plus d'état vide quand il y a des tâches.
    expect(screen.queryByText("Aucune tâche en cours")).toBeNull();
  });

  it("statut : running via title « en cours », done via title « terminé »", () => {
    render(
      <TasksPanel
        tasks={[
          task({ id: "t1", status: "running" }),
          task({ id: "t2", agent: "legolas", status: "done" }),
        ]}
      />,
    );
    expect(screen.getByTitle("en cours")).toBeTruthy();
    expect(screen.getByTitle("terminé")).toBeTruthy();
  });

  it("compteur = nombre de tâches running uniquement", () => {
    render(
      <TasksPanel
        tasks={[
          task({ id: "t1", status: "running" }),
          task({ id: "t2", agent: "legolas", status: "running" }),
          task({ id: "t3", agent: "gimli", status: "done" }),
        ]}
      />,
    );
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("vignette d'agent quand resolveAvatar renvoie une URL (alt = nom)", () => {
    render(
      <TasksPanel
        tasks={[task({ id: "t1", agent: "gandalf" })]}
        resolveAvatar={(a) => `/assets/${a.toLowerCase()}.png`}
      />,
    );
    expect(screen.getByAltText("Gandalf")).toBeTruthy();
  });

  it("fallback : resolveAvatar=null → pas d'image, initiale conservée", () => {
    render(
      <TasksPanel
        tasks={[task({ id: "t1", agent: "gandalf" })]}
        resolveAvatar={() => null}
      />,
    );
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("Gandalf")).toBeTruthy();
  });

  it("fallback : onError sur la vignette → image retirée (jamais cassée), nom conservé", () => {
    render(
      <TasksPanel
        tasks={[task({ id: "t1", agent: "gandalf" })]}
        resolveAvatar={() => "/broken.png"}
      />,
    );
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("Gandalf")).toBeTruthy();
  });
});
