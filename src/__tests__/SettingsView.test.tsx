import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsView } from "../views/SettingsView";
import { DEFAULT_UI, type UseSettings } from "../hooks/useSettings";
import {
  defaultTeamFromDemo,
  DEFAULT_TEAM_ID,
  type UseTeams,
} from "../hooks/useTeams";
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

/** Stub de `useTeams` : une team par défaut éditable, setters spies. */
function makeTeams(overrides: Partial<UseTeams> = {}): UseTeams {
  const team = defaultTeamFromDemo("lotr");
  return {
    teams: [team],
    loaded: true,
    defaultTeamId: DEFAULT_TEAM_ID,
    teamForProject: () => team,
    coordinatorOf: (t) => t.agents.find((a) => a.id === t.coordinator) ?? null,
    agentInTeam: (t, name) =>
      t.agents.find((a) => a.name.toLowerCase() === name.toLowerCase()) ?? null,
    hasBinding: () => false,
    upsertTeam: vi.fn(async () => {}),
    removeTeam: vi.fn(async () => {}),
    upsertAgent: vi.fn(async () => {}),
    removeAgent: vi.fn(async () => {}),
    setCoordinator: vi.fn(async () => {}),
    bindProjectTeam: vi.fn(async () => {}),
    reload: vi.fn(async () => {}),
    ...overrides,
  };
}

function renderView(props: {
  settings?: UseSettings;
  teams?: UseTeams;
  onNotify?: NotifyFn;
}) {
  return render(
    <SettingsView
      settings={props.settings ?? makeSettings()}
      teams={props.teams ?? makeTeams()}
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

  it("L11 : l'éditeur « Teams & agents » est rendu (runner par agent)", () => {
    renderView({});
    expect(
      screen.getByRole("heading", { name: "Teams & agents" }),
    ).toBeTruthy();
    // Le runner du coordinateur (Aragorn = roleIndex 1) est éditable par agent.
    expect(screen.getByLabelText("Runner de aragorn")).toBeTruthy();
  });
});
