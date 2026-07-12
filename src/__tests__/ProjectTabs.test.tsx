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
    history: [],
    pending: false,
    error: null,
    ...over,
  };
}

describe("ProjectTabs — barre d'onglets par projet (L24 F2)", () => {
  it("aucune conversation → ne rend rien", () => {
    const { container } = render(
      <ProjectTabs
        conversations={[]}
        activeProjectId={null}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(container.querySelector(".projtabs")).toBeNull();
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
      />,
    );
    const tab = screen.getByRole("tab", { name: "alpha" });
    const close = screen.getByRole("button", { name: /Fermer l'onglet alpha/ });
    expect(tab.contains(close)).toBe(false);
    expect(close.contains(tab)).toBe(false);
  });
});
