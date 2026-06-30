import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsView } from "../views/SettingsView";
import { DEFAULT_UI, type UseSettings } from "../hooks/useSettings";
import type { NotifyAck, notifyUser } from "../api/backend";

type NotifyFn = typeof notifyUser;

/** Stub minimal de `useSettings` : les setters sont des spies no-op résolus. */
function makeSettings(overrides: Partial<UseSettings> = {}): UseSettings {
  const noop = vi.fn(async () => {});
  return {
    root: "/root",
    litellmEndpoint: "",
    litellmModel: "",
    aiKeySet: false,
    couchdbUrl: "",
    couchdbDb: "",
    couchCredsSet: false,
    n8nWebhookUrl: "",
    n8nActiveSupport: "slack",
    n8nTokenSet: false,
    theme: "naonedge-dark",
    lang: "fr",
    team: "lotr",
    chefRunnerKind: "claude-code",
    chefModel: "",
    chefAllowedTools: "",
    chefTrustMode: "inherit",
    hidePensee: true,
    ui: DEFAULT_UI,
    loaded: true,
    setRoot: noop,
    setLitellmEndpoint: noop,
    setLitellmModel: noop,
    setAiKey: noop,
    setCouchdbUrl: noop,
    setCouchdbDb: noop,
    setCouchCredentials: noop,
    setN8nWebhookUrl: noop,
    setN8nActiveSupport: noop,
    setN8nToken: noop,
    setTheme: noop,
    setLang: noop,
    setTeam: noop,
    setChefRunnerKind: noop,
    setChefModel: noop,
    setChefAllowedTools: noop,
    setChefTrustMode: noop,
    setHidePensee: noop,
    setUiPref: noop,
    ...overrides,
  };
}

function renderView(props: {
  settings?: UseSettings;
  onNotify?: NotifyFn;
}) {
  return render(
    <SettingsView
      settings={props.settings ?? makeSettings()}
      services={[]}
      onRescan={() => {}}
      onNotify={
        props.onNotify ??
        vi.fn(async () => ({ ok: true, provider: "mock", http_status: null }))
      }
    />,
  );
}

describe("SettingsView — canal adresse externe (L6)", () => {
  it("le bouton « Tester l'envoi » déclenche onNotify avec message/support/cible/meta", async () => {
    const onNotify = vi.fn<NotifyFn>(
      async (): Promise<NotifyAck> => ({
        ok: true,
        provider: "n8n",
        http_status: 200,
      }),
    );
    renderView({
      settings: makeSettings({ n8nActiveSupport: "discord" }),
      onNotify,
    });

    fireEvent.change(screen.getByLabelText("Cible du message"), {
      target: { value: "#iakaframe" },
    });
    fireEvent.change(screen.getByLabelText("Message de test"), {
      target: { value: "ping depuis le cockpit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tester l'envoi" }));

    await waitFor(() => expect(onNotify).toHaveBeenCalledTimes(1));
    const [message, support, cible, meta] = onNotify.mock.calls[0];
    expect(message).toBe("ping depuis le cockpit");
    expect(support).toBe("discord");
    expect(cible).toBe("#iakaframe");
    expect(meta).toMatchObject({ royaume: "IAKACOCKPIT", source: "iakacockpit" });

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("n8n"),
    );
    expect(screen.getByRole("status").textContent).toContain("200");
  });

  it("affiche l'erreur lisible si onNotify rejette (dégradation, zéro crash)", async () => {
    const onNotify = vi.fn(async () => {
      throw new Error("passerelle n8n injoignable : connexion refusée");
    });
    renderView({ onNotify: onNotify as unknown as NotifyFn });
    fireEvent.change(screen.getByLabelText("Message de test"), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tester l'envoi" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("injoignable"),
    );
  });

  it("rend le mode mock (provider mock) sans POST réel", async () => {
    const onNotify = vi.fn(
      async (): Promise<NotifyAck> => ({
        ok: true,
        provider: "mock",
        http_status: null,
      }),
    );
    renderView({ onNotify });
    fireEvent.change(screen.getByLabelText("Message de test"), {
      target: { value: "m" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tester l'envoi" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("Mock"),
    );
  });

  it("le sélecteur de support reflète l'état (slack actif par défaut)", () => {
    renderView({});
    const slack = screen.getByRole("button", { name: "Slack" });
    expect(slack.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("SettingsView — vignettes & chef-runner", () => {
  it("L9-A3 : le sélecteur de team reflète la team active et appelle setTeam au changement", () => {
    const setTeam = vi.fn(async () => {});
    renderView({ settings: makeSettings({ team: "avengers", setTeam }) });
    const select = screen.getByLabelText("Team de vignettes") as HTMLSelectElement;
    expect(select.value).toBe("avengers");
    fireEvent.change(select, { target: { value: "starfleet" } });
    expect(setTeam).toHaveBeenCalledWith("starfleet");
  });

  it("L11 : runner/modèle GLOBAUX retirés ; allowlist + trust restent GLOBAUX", () => {
    const setChefAllowedTools = vi.fn(async () => {});
    const setChefTrustMode = vi.fn(async () => {});
    renderView({
      settings: makeSettings({ setChefAllowedTools, setChefTrustMode }),
    });

    // Les champs runner/modèle GLOBAUX ont disparu (superseded par-agent, L11).
    expect(screen.queryByLabelText("Runner du chef")).toBeNull();
    expect(screen.queryByLabelText("Modèle du chef-runner")).toBeNull();

    // Allowlist (globale, AR-3) conservée.
    const toolsField = screen.getByLabelText(
      "Allowlist d'outils du chef-runner",
    ) as HTMLInputElement;
    fireEvent.change(toolsField, { target: { value: "Read,Glob" } });
    fireEvent.click(
      screen
        .getByLabelText("Allowlist d'outils du chef-runner")
        .parentElement!.querySelector("button")!,
    );
    expect(setChefAllowedTools).toHaveBeenCalledWith("Read,Glob");

    // Trust mode : segment « acceptation ».
    fireEvent.click(screen.getByRole("button", { name: "acceptation" }));
    expect(setChefTrustMode).toHaveBeenCalledWith("accept");
  });

  it("L9 : le sélecteur de team propose « Aucune » + les teams embarquées", () => {
    renderView({});
    const select = screen.getByLabelText("Team de vignettes");
    const values = Array.from(select.querySelectorAll("option")).map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(values).toContain("none");
    expect(values).toContain("lotr");
    expect(values).toContain("avengers");
    expect(values).toContain("starfleet");
  });

  it("L13 : l'éditeur « Teams & agents » n'est PLUS dans Réglages (sorti vers la vue Teams)", () => {
    renderView({});
    expect(
      screen.queryByRole("heading", { name: "Casting" }),
    ).toBeNull();
    expect(screen.queryByLabelText("Runner de aragorn")).toBeNull();
  });

  it("L14 : la section Charte liste les 10 chartes iakagraph", () => {
    const { container } = renderView({});
    const cards = container.querySelectorAll(".themegrid .tcard");
    expect(cards.length).toBe(10);
    // Quelques chartes témoins (naonedge conservées + nouvelles iakagraph).
    expect(screen.getByRole("button", { name: "NaonEdge dark" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "OS Windows" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Grimoire dark-fantasy" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Studio clair" })).toBeTruthy();
  });

  it("L14 : sélectionner une charte appelle setTheme avec son id (repeint l'app)", () => {
    const setTheme = vi.fn(async () => {});
    renderView({ settings: makeSettings({ setTheme }) });
    fireEvent.click(screen.getByRole("button", { name: "OS Windows" }));
    expect(setTheme).toHaveBeenCalledWith("os-windows");
  });

  it("L14 : la charte active porte l'état sélectionné (aria-pressed)", () => {
    renderView({ settings: makeSettings({ theme: "cartoon-std" }) });
    expect(
      screen.getByRole("button", { name: "Cartoon std" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "OS macOS" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });
});

describe("SettingsView — sommaire du menu gauche (L12)", () => {
  // Le menu DOIT refléter les sections RÉELLES du panneau (les <h2>), chacune
  // ayant une cible `id` dans le DOM. On vérifie l'exactitude (item ↔ section) et
  // que cliquer un item active l'item ET cible la bonne section.
  const EXPECTED = [
    { item: "Interface", id: "set-interface" },
    { item: "Police", id: "set-police" },
    { item: "Charte", id: "set-charte" },
    { item: "Cockpit", id: "set-cockpit" },
    { item: "IA (LiteLLM)", id: "set-ia" },
    { item: "Sécurité d'exécution", id: "set-securite" },
    { item: "Main courante", id: "set-maincourante" },
    { item: "Canal adresse (n8n)", id: "set-adresse" },
    { item: "Services iakabox", id: "set-services" },
  ];

  // Libellé visible d'un item : le nœud texte du bouton (sommaire en texte seul,
  // emojis décoratifs retirés).
  const labelOf = (b: Element): string => b.lastChild?.textContent?.trim() ?? "";

  it("liste exactement les sections réelles, chacune avec sa cible dans le DOM", () => {
    const { container } = renderView({});
    const nav = screen.getByRole("navigation", { name: "Sections réglages" });
    const items = Array.from(nav.querySelectorAll("button.seti")).map(labelOf);
    // Plus aucun item décoratif « Généraux »/« Cockpit » seul ; Teams sortie (L13)
    // dans sa vue dédiée : 9 sections réelles restantes.
    expect(items).toEqual(EXPECTED.map((e) => e.item));
    // Chaque item a une section-cible présente dans le panneau.
    for (const e of EXPECTED) {
      expect(container.querySelector(`#${e.id}`)).toBeTruthy();
    }
  });

  it("un seul item actif au départ (premier), pas de double-active sur les panneaux", () => {
    const { container } = renderView({});
    const actives = container.querySelectorAll("button.seti.active");
    expect(actives.length).toBe(1);
    expect(labelOf(actives[0])).toBe("Interface");
    // Les anciens panneaux ne portent plus la classe `active` (double-active corrigé).
    expect(container.querySelectorAll(".setpanel.active").length).toBe(0);
  });

  it("cliquer un item l'active (et défile vers sa section)", () => {
    const scrollSpy = vi.fn();
    // jsdom n'implémente pas scrollIntoView : on le stube pour vérifier la cible.
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollSpy,
    });
    const { container } = renderView({});

    fireEvent.click(screen.getByRole("button", { name: /Main courante/ }));
    const actives = container.querySelectorAll("button.seti.active");
    expect(actives.length).toBe(1);
    expect(labelOf(actives[0])).toBe("Main courante");
    expect(scrollSpy).toHaveBeenCalled();
  });
});
