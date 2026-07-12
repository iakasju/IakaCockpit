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
  onEnterFocus: () => {},
  onExitFocus: () => {},
};

describe("ProjectTabs — barre d'onglets par projet (L24 F2)", () => {
  it("aucune conversation → rend quand même la barre (avec les feux L26)", () => {
    const { container } = render(
      <ProjectTabs
        conversations={[]}
        activeProjectId={null}
        onSelect={() => {}}
        onClose={() => {}}
        {...FOCUS_DEFAULTS}
      />,
    );
    // La barre est TOUJOURS rendue (les feux focus y vivent), même sans onglet.
    expect(container.querySelector(".projtabs")).not.toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(container.querySelector(".projfocus")).not.toBeNull();
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

describe("ProjectTabs — feux macOS de mode focus (L26)", () => {
  function renderFeux(over: Partial<Parameters<typeof ProjectTabs>[0]> = {}) {
    return render(
      <ProjectTabs
        conversations={[conv({ projectId: "alpha", title: "alpha" })]}
        activeProjectId="alpha"
        onSelect={() => {}}
        onClose={() => {}}
        focus={false}
        onEnterFocus={() => {}}
        onExitFocus={() => {}}
        {...over}
      />,
    );
  }

  it("rend les 2 feux (vert = agrandir, jaune = revenir à la normale)", () => {
    renderFeux();
    expect(
      screen.getByRole("button", { name: /Agrandir la zone de travail/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Revenir à la normale/ }),
    ).toBeTruthy();
  });

  it("clic vert → onEnterFocus", () => {
    const onEnterFocus = vi.fn();
    renderFeux({ onEnterFocus });
    fireEvent.click(
      screen.getByRole("button", { name: /Agrandir la zone de travail/ }),
    );
    expect(onEnterFocus).toHaveBeenCalledTimes(1);
  });

  it("clic jaune → onExitFocus", () => {
    const onExitFocus = vi.fn();
    renderFeux({ focus: true, onExitFocus });
    fireEvent.click(
      screen.getByRole("button", { name: /Revenir à la normale/ }),
    );
    expect(onExitFocus).toHaveBeenCalledTimes(1);
  });

  it("état normal : le jaune est désactivé (déjà à l'état courant), le vert actif", () => {
    renderFeux({ focus: false });
    const green = screen.getByRole("button", {
      name: /Agrandir la zone de travail/,
    }) as HTMLButtonElement;
    const yellow = screen.getByRole("button", {
      name: /Revenir à la normale/,
    }) as HTMLButtonElement;
    expect(green.disabled).toBe(false);
    expect(yellow.disabled).toBe(true);
  });

  it("état focus : le vert est désactivé (déjà à l'état courant), le jaune actif", () => {
    renderFeux({ focus: true });
    const green = screen.getByRole("button", {
      name: /Agrandir la zone de travail/,
    }) as HTMLButtonElement;
    const yellow = screen.getByRole("button", {
      name: /Revenir à la normale/,
    }) as HTMLButtonElement;
    expect(green.disabled).toBe(true);
    expect(yellow.disabled).toBe(false);
  });
});
