import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Roster } from "../components/Roster";
import { DEMO_TEAM, teamBadge } from "../mock/demoTeam";

afterEach(cleanup);

describe("Roster — widget team (L8/D6)", () => {
  it("rend les 5 agents en pastilles [ROYAUME][Agent]", () => {
    render(<Roster currentAgent="Aragorn" pending={false} onPick={() => {}} />);
    expect(DEMO_TEAM).toHaveLength(5);
    for (const m of DEMO_TEAM) {
      expect(screen.getByText(teamBadge(m))).toBeTruthy();
      // Royaume en MAJUSCULE dans la pastille.
      expect(teamBadge(m)).toContain(`[${m.royaume}]`);
      expect(m.royaume).toBe(m.royaume.toUpperCase());
    }
  });

  it("statut « attend » par défaut, « travaille » pour l'agent courant si pending", () => {
    const { rerender } = render(
      <Roster currentAgent="Gimli" pending={false} onPick={() => {}} />,
    );
    // Aucun « travaille » tant que pas pending.
    expect(screen.queryByText("travaille")).toBeNull();
    expect(screen.getAllByText("attend")).toHaveLength(5);

    rerender(<Roster currentAgent="Gimli" pending onPick={() => {}} />);
    // Seul l'agent courant « travaille ».
    expect(screen.getAllByText("travaille")).toHaveLength(1);
    expect(screen.getAllByText("attend")).toHaveLength(4);
  });

  it("met en évidence l'agent courant (aria-pressed)", () => {
    render(<Roster currentAgent="Gandalf" pending={false} onPick={() => {}} />);
    const current = screen.getByTitle("S'adresser à Gandalf (@Gandalf)");
    expect(current.getAttribute("aria-pressed")).toBe("true");
    const other = screen.getByTitle("S'adresser à Gimli (@Gimli)");
    expect(other.getAttribute("aria-pressed")).toBe("false");
  });

  it("clic sur un agent → callback onPick(agent)", () => {
    const onPick = vi.fn();
    render(<Roster currentAgent="Aragorn" pending={false} onPick={onPick} />);
    fireEvent.click(screen.getByTitle("S'adresser à Legolas (@Legolas)"));
    expect(onPick).toHaveBeenCalledWith("Legolas");
  });

  it("L9-A5 : rend une vignette par agent quand resolveAvatar renvoie une URL, pastille conservée", () => {
    const resolveAvatar = (agent: string) =>
      `/assets/${agent.toLowerCase()}.png`;
    render(
      <Roster
        currentAgent="Aragorn"
        pending={false}
        onPick={() => {}}
        resolveAvatar={resolveAvatar}
      />,
    );
    // Une image par membre, alt = nom d'agent.
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(DEMO_TEAM.length);
    expect(screen.getByAltText("Gandalf")).toBeTruthy();
    // La pastille [ROYAUME][Agent] reste présente (identité iakaframe).
    for (const m of DEMO_TEAM) {
      expect(screen.getByText(teamBadge(m))).toBeTruthy();
    }
  });

  it("L9-A2 fallback : resolveAvatar=null → aucune image, pastilles seules", () => {
    const resolveAvatar = () => null;
    render(
      <Roster
        currentAgent="Aragorn"
        pending={false}
        onPick={() => {}}
        resolveAvatar={resolveAvatar}
      />,
    );
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText(teamBadge(DEMO_TEAM[0]))).toBeTruthy();
  });

  it("L9-A2 fallback : sans resolveAvatar (L8) → aucune image", () => {
    render(<Roster currentAgent="Aragorn" pending={false} onPick={() => {}} />);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("L9-A2 fallback : onError sur une vignette → l'image disparaît (jamais cassée)", () => {
    const resolveAvatar = () => "/broken.png";
    render(
      <Roster
        currentAgent="Aragorn"
        pending={false}
        onPick={() => {}}
        resolveAvatar={resolveAvatar}
      />,
    );
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThan(0);
    // Simule l'échec de chargement sur la première vignette.
    fireEvent.error(imgs[0]);
    expect(screen.getAllByRole("img")).toHaveLength(DEMO_TEAM.length - 1);
    // La pastille reste.
    expect(screen.getByText(teamBadge(DEMO_TEAM[0]))).toBeTruthy();
  });
});
