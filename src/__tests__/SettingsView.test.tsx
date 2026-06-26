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
    team: "lotr",
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
    setUiPref: noop,
    ...overrides,
  };
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
    render(
      <SettingsView
        settings={makeSettings({ n8nActiveSupport: "discord" })}
        services={[]}
        onRescan={() => {}}
        onNotify={onNotify}
      />,
    );

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

    // L'ack est rendu (provider n8n, HTTP 200).
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("n8n"),
    );
    expect(screen.getByRole("status").textContent).toContain("200");
  });

  it("affiche l'erreur lisible si onNotify rejette (dégradation, zéro crash)", async () => {
    const onNotify = vi.fn(async () => {
      throw new Error("passerelle n8n injoignable : connexion refusée");
    });
    render(
      <SettingsView
        settings={makeSettings()}
        services={[]}
        onRescan={() => {}}
        onNotify={onNotify}
      />,
    );
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
    render(
      <SettingsView
        settings={makeSettings()}
        services={[]}
        onRescan={() => {}}
        onNotify={onNotify}
      />,
    );
    fireEvent.change(screen.getByLabelText("Message de test"), {
      target: { value: "m" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tester l'envoi" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("Mock"),
    );
  });

  it("le sélecteur de support reflète l'état (slack actif par défaut)", () => {
    render(
      <SettingsView
        settings={makeSettings()}
        services={[]}
        onRescan={() => {}}
        onNotify={vi.fn(async () => ({ ok: true, provider: "mock", http_status: null }))}
      />,
    );
    const slack = screen.getByRole("button", { name: "Slack" });
    expect(slack.getAttribute("aria-pressed")).toBe("true");
  });

  it("L9-A3 : le sélecteur de team reflète la team active et appelle setTeam au changement", () => {
    const setTeam = vi.fn(async () => {});
    render(
      <SettingsView
        settings={makeSettings({ team: "avengers", setTeam })}
        services={[]}
        onRescan={() => {}}
        onNotify={vi.fn(async () => ({ ok: true, provider: "mock", http_status: null }))}
      />,
    );
    const select = screen.getByLabelText("Team de vignettes") as HTMLSelectElement;
    expect(select.value).toBe("avengers");
    fireEvent.change(select, { target: { value: "starfleet" } });
    expect(setTeam).toHaveBeenCalledWith("starfleet");
  });

  it("L9 : le sélecteur de team propose « Aucune » + les teams embarquées", () => {
    render(
      <SettingsView
        settings={makeSettings()}
        services={[]}
        onRescan={() => {}}
        onNotify={vi.fn(async () => ({ ok: true, provider: "mock", http_status: null }))}
      />,
    );
    const select = screen.getByLabelText("Team de vignettes");
    const values = Array.from(select.querySelectorAll("option")).map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(values).toContain("none");
    expect(values).toContain("lotr");
    expect(values).toContain("avengers");
    expect(values).toContain("starfleet");
  });
});
