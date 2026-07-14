import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ProjectTabs } from "../components/ProjectTabs";
import type { Conversation } from "../hooks/useConversations";

afterEach(cleanup);

function conv(over: Partial<Conversation> = {}): Conversation {
  return {
    projectId: "alpha",
    title: "alpha",
    cwd: "/root/alpha",
    mode: "chat",
    agent: "Aragorn",
    ptySessionId: "s-alpha",
    source: "owned",
    attachedSessionId: null,
    attachedTranscriptPath: null,
    history: [],
    pending: false,
    error: null,
    ...over,
  };
}

// Props focus par défaut (L26) — les tests L24 n'en dépendent pas.
const FOCUS_DEFAULTS = {
  focus: false,
  onToggleFocus: () => {},
};

describe("ProjectTabs — barre d'onglets par projet (L24 F2)", () => {
  it("aucune conversation → rend quand même la barre (avec le toggle L26)", () => {
    const { container } = render(
      <ProjectTabs
        conversations={[]}
        activeProjectId={null}
        onSelect={() => {}}
        onClose={() => {}}
        {...FOCUS_DEFAULTS}
      />,
    );
    // La barre est TOUJOURS rendue (le switch focus y vit), même sans onglet.
    expect(container.querySelector(".projtabs")).not.toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(container.querySelector(".fsswitch")).not.toBeNull();
    expect(container.querySelector(".fsbtn")).toBeNull();
  });

  it("rend un onglet par conversation (libellé = titre du projet)", () => {
    render(
      <ProjectTabs
        conversations={[
          conv({ projectId: "alpha", title: "alpha" }),
          conv({ projectId: "beta", title: "beta" }),
        ]}
        activeProjectId="alpha"
        onSelect={() => {}}
        onClose={() => {}}
        {...FOCUS_DEFAULTS}
      />,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs.map((t) => t.textContent)).toEqual(["alpha", "beta"]);
  });

  it("onglet actif mis en évidence (aria-selected)", () => {
    render(
      <ProjectTabs
        conversations={[
          conv({ projectId: "alpha", title: "alpha" }),
          conv({ projectId: "beta", title: "beta" }),
        ]}
        activeProjectId="beta"
        onSelect={() => {}}
        onClose={() => {}}
        {...FOCUS_DEFAULTS}
      />,
    );
    expect(
      screen.getByRole("tab", { name: "alpha" }).getAttribute("aria-selected"),
    ).toBe("false");
    expect(
      screen.getByRole("tab", { name: "beta" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("clic sur un onglet → onSelect(projectId)", () => {
    const onSelect = vi.fn();
    render(
      <ProjectTabs
        conversations={[conv({ projectId: "beta", title: "beta" })]}
        activeProjectId="alpha"
        onSelect={onSelect}
        onClose={() => {}}
        {...FOCUS_DEFAULTS}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "beta" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("beta");
  });

  it("clic sur le « × » → onClose(projectId), sans sélectionner", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <ProjectTabs
        conversations={[conv({ projectId: "alpha", title: "alpha" })]}
        activeProjectId="alpha"
        onSelect={onSelect}
        onClose={onClose}
        {...FOCUS_DEFAULTS}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Fermer l'onglet alpha/ }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith("alpha");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("anti button-in-button : l'onglet et son « × » sont deux boutons frères", () => {
    render(
      <ProjectTabs
        conversations={[conv({ projectId: "alpha", title: "alpha" })]}
        activeProjectId="alpha"
        onSelect={() => {}}
        onClose={() => {}}
        {...FOCUS_DEFAULTS}
      />,
    );
    const tab = screen.getByRole("tab", { name: "alpha" });
    const close = screen.getByRole("button", { name: /Fermer l'onglet alpha/ });
    expect(tab.contains(close)).toBe(false);
    expect(close.contains(tab)).toBe(false);
  });
});

describe("ProjectTabs — point de statut vivant par slot (L31-P2)", () => {
  it("rend un point running/idle selon liveStatus, keyé par projectId", () => {
    const { container } = render(
      <ProjectTabs
        conversations={[
          conv({ projectId: "alpha", title: "alpha" }),
          conv({ projectId: "beta", title: "beta" }),
        ]}
        activeProjectId="alpha"
        onSelect={() => {}}
        onClose={() => {}}
        liveStatus={{ alpha: "running", beta: "idle" }}
        {...FOCUS_DEFAULTS}
      />,
    );
    expect(container.querySelector(".projtab .pt-status.running")).not.toBeNull();
    expect(container.querySelector(".projtab .pt-status.idle")).not.toBeNull();
  });

  it("sans liveStatus → aucun point (rétro-compat)", () => {
    const { container } = render(
      <ProjectTabs
        conversations={[conv({ projectId: "alpha", title: "alpha" })]}
        activeProjectId="alpha"
        onSelect={() => {}}
        onClose={() => {}}
        {...FOCUS_DEFAULTS}
      />,
    );
    expect(container.querySelector(".pt-status")).toBeNull();
  });

  it("projectId absent de liveStatus → pas de point pour cet onglet", () => {
    const { container } = render(
      <ProjectTabs
        conversations={[conv({ projectId: "alpha", title: "alpha" })]}
        activeProjectId="alpha"
        onSelect={() => {}}
        onClose={() => {}}
        liveStatus={{}}
        {...FOCUS_DEFAULTS}
      />,
    );
    expect(container.querySelector(".pt-status")).toBeNull();
  });
});

describe("ProjectTabs — bouton « + » ouvrir un projet (polish P4)", () => {
  it("rend le bouton « + » (aria-label) quand onAddProject est fourni", () => {
    const { container } = render(
      <ProjectTabs
        conversations={[conv({ projectId: "alpha", title: "alpha" })]}
        activeProjectId="alpha"
        onSelect={() => {}}
        onClose={() => {}}
        onAddProject={() => {}}
        {...FOCUS_DEFAULTS}
      />,
    );
    const add = screen.getByRole("button", {
      name: /Ouvrir un projet sur la table/,
    });
    expect(add).toBeTruthy();
    // Posé AVANT le switch plein écran, hors de la zone scrollable des onglets.
    expect(container.querySelector(".pt-add")).not.toBeNull();
    expect(container.querySelector(".projtabs-list")?.contains(add)).toBe(false);
  });

  it("clic sur « + » → onAddProject()", () => {
    const onAddProject = vi.fn();
    render(
      <ProjectTabs
        conversations={[]}
        activeProjectId={null}
        onSelect={() => {}}
        onClose={() => {}}
        onAddProject={onAddProject}
        {...FOCUS_DEFAULTS}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Ouvrir un projet sur la table/ }),
    );
    expect(onAddProject).toHaveBeenCalledTimes(1);
  });

  it("sans onAddProject : pas de bouton « + » rendu", () => {
    const { container } = render(
      <ProjectTabs
        conversations={[]}
        activeProjectId={null}
        onSelect={() => {}}
        onClose={() => {}}
        {...FOCUS_DEFAULTS}
      />,
    );
    expect(container.querySelector(".pt-add")).toBeNull();
  });
});

describe("ProjectTabs — switch plein écran de mode focus (L26 révision v2)", () => {
  function renderToggle(over: Partial<Parameters<typeof ProjectTabs>[0]> = {}) {
    return render(
      <ProjectTabs
        conversations={[conv({ projectId: "alpha", title: "alpha" })]}
        activeProjectId="alpha"
        onSelect={() => {}}
        onClose={() => {}}
        focus={false}
        onToggleFocus={() => {}}
        {...over}
      />,
    );
  }

  it("rend UN seul switch plein écran (role=switch, glyphe dans la pastille, sans libellé) quand off", () => {
    const { container } = renderToggle();
    expect(
      screen.getByRole("switch", { name: /Plein écran \(mode focus\)/ }),
    ).toBeTruthy();
    // Un seul switch, pas d'ancien bouton-icône `.fsbtn` ni de feux.
    expect(container.querySelectorAll(".fsswitch")).toHaveLength(1);
    expect(container.querySelector(".fsbtn")).toBeNull();
    expect(container.querySelector(".feu")).toBeNull();
    // Plus de libellé texte : le mot « Plein écran » ne doit pas être VISIBLE.
    expect(container.querySelector(".fsswitch-label")).toBeNull();
    expect(container.querySelector(".fsswitch")?.textContent).not.toContain(
      "Plein écran",
    );
    // Le glyphe `⤢` vit DANS la pastille qui glisse.
    const knob = container.querySelector(".fsswitch-knob");
    expect(knob).not.toBeNull();
    expect(knob?.querySelector(".fsswitch-ico")?.textContent).toBe("⤢");
  });

  it("aria-checked reflète l'état focus (false quand off)", () => {
    const { container } = renderToggle({ focus: false });
    const sw = screen.getByRole("switch", {
      name: /Plein écran \(mode focus\)/,
    });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    // Pastille à gauche = pas de classe `on`.
    expect(container.querySelector(".fsswitch.on")).toBeNull();
  });

  it("en focus : aria-checked=true, classe `on` (pastille à droite) et libellé « Quitter le plein écran »", () => {
    const { container } = renderToggle({ focus: true });
    const sw = screen.getByRole("switch", { name: /Quitter le plein écran/ });
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(container.querySelector(".fsswitch.on")).not.toBeNull();
  });

  it("clic → onToggleFocus (off → on)", () => {
    const onToggleFocus = vi.fn();
    renderToggle({ focus: false, onToggleFocus });
    fireEvent.click(
      screen.getByRole("switch", { name: /Plein écran \(mode focus\)/ }),
    );
    expect(onToggleFocus).toHaveBeenCalledTimes(1);
  });

  it("clic → onToggleFocus (on → off, symétrique)", () => {
    const onToggleFocus = vi.fn();
    renderToggle({ focus: true, onToggleFocus });
    fireEvent.click(
      screen.getByRole("switch", { name: /Quitter le plein écran/ }),
    );
    expect(onToggleFocus).toHaveBeenCalledTimes(1);
  });
});
