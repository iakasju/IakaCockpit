import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Roster } from "../components/Roster";
import { DEMO_TEAM } from "../mock/demoTeam";
import { isCanonicalRole, roleLabel } from "../theme/roles";

afterEach(cleanup);

describe("Roster — widget team (L8/D6)", () => {
  it("rend les 7 agents : nom en clair + rôle en label discret (direction A)", () => {
    render(<Roster currentAgent="Aragorn" pending={false} onPick={() => {}} />);
    expect(DEMO_TEAM).toHaveLength(7);
    for (const m of DEMO_TEAM) {
      // Nom de l'agent en clair (plus de pastille [ROYAUME][Agent] tronquée).
      expect(screen.getByText(m.agent)).toBeTruthy();
      // Rôle affiché = libellé traduit (i18n `roles.*` ; FR en test = label canonique).
      expect(isCanonicalRole(m.royaume)).toBe(true);
      expect(screen.getByText(roleLabel(m.royaume))).toBeTruthy();
    }
  });

  it("statut « attend » par défaut, « travaille » pour l'agent courant si pending", () => {
    const { rerender } = render(
      <Roster currentAgent="Gimli" pending={false} onPick={() => {}} />,
    );
    // Aucun « travaille » tant que pas pending.
    expect(screen.queryByText("travaille")).toBeNull();
    expect(screen.getAllByText("attend")).toHaveLength(7);

    rerender(<Roster currentAgent="Gimli" pending onPick={() => {}} />);
    // Seul l'agent courant « travaille ».
    expect(screen.getAllByText("travaille")).toHaveLength(1);
    expect(screen.getAllByText("attend")).toHaveLength(6);
  });

  it("L10b/P3 : workingAgents (transcript) prime — un délégué « travaille » même hors courant", () => {
    // Gandalf délégué (minuscule, comme subagent_type) ; courant = Aragorn, pas pending.
    render(
      <Roster
        currentAgent="Aragorn"
        pending={false}
        workingAgents={new Set(["gandalf"])}
        onPick={() => {}}
      />,
    );
    // Seul Gandalf travaille (matching insensible à la casse).
    expect(screen.getAllByText("travaille")).toHaveLength(1);
    const gandalf = screen.getByTitle("S'adresser à Gandalf (@Gandalf)");
    expect(gandalf.textContent).toContain("travaille");
  });

  it("L10b/P3 : workingAgents vide → aucun « travaille » (ignore pending, repli neutralisé)", () => {
    render(
      <Roster
        currentAgent="Aragorn"
        pending
        workingAgents={new Set()}
        onPick={() => {}}
      />,
    );
    expect(screen.queryByText("travaille")).toBeNull();
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

  it("L31-P1 : bouton « lancer » appelle onLaunch(agent), distinct du @agent (onPick)", () => {
    const onPick = vi.fn();
    const onLaunch = vi.fn();
    render(
      <Roster
        currentAgent="Aragorn"
        pending={false}
        onPick={onPick}
        onLaunch={onLaunch}
      />,
    );
    // Un bouton « lancer » par agent (aria-label i18n).
    const launch = screen.getByLabelText(
      "Lancer Gimli comme runner réel (slot dédié)",
    );
    fireEvent.click(launch);
    expect(onLaunch).toHaveBeenCalledWith("Gimli");
    // Le @agent (onPick) reste indépendant : cliquer l'item n'appelle pas onLaunch.
    fireEvent.click(screen.getByTitle("S'adresser à Legolas (@Legolas)"));
    expect(onPick).toHaveBeenCalledWith("Legolas");
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("L31-P1 : sans onLaunch → aucun bouton « lancer » (rétro-compat L8)", () => {
    render(<Roster currentAgent="Aragorn" pending={false} onPick={() => {}} />);
    expect(
      screen.queryByLabelText("Lancer Gimli comme runner réel (slot dédié)"),
    ).toBeNull();
  });

  it("L31-P1 : bouton désactivé pour un agent non lançable (runner non câblé)", () => {
    const onLaunch = vi.fn();
    render(
      <Roster
        currentAgent="Aragorn"
        pending={false}
        onPick={() => {}}
        onLaunch={onLaunch}
        launchableAgents={new Set(["gimli"])}
      />,
    );
    // Gimli lançable : bouton actif.
    const gimli = screen.getByLabelText(
      "Lancer Gimli comme runner réel (slot dédié)",
    ) as HTMLButtonElement;
    expect(gimli.disabled).toBe(false);
    // Legolas hors ensemble : bouton désactivé (« défini, non câblé »).
    const legolas = screen.getByLabelText(
      "Legolas : runner défini mais non câblé (non exécutable) — lancement indisponible",
    ) as HTMLButtonElement;
    expect(legolas.disabled).toBe(true);
    fireEvent.click(legolas);
    expect(onLaunch).not.toHaveBeenCalled();
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
    // Nom + rôle (libellé traduit) restent présents (identité iakaframe), vignette en plus.
    for (const m of DEMO_TEAM) {
      expect(screen.getByText(m.agent)).toBeTruthy();
      expect(screen.getByText(roleLabel(m.royaume))).toBeTruthy();
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
    expect(screen.getByText(DEMO_TEAM[0].agent)).toBeTruthy();
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
    expect(screen.getByText(DEMO_TEAM[0].agent)).toBeTruthy();
  });
});
