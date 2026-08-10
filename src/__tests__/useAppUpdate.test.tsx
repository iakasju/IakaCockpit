/**
 * useAppUpdate + UpdateBanner (L34) — machine à états du contrôle de mise à jour.
 *
 * Les PLUGINS Tauri sont mockés (`vi.mock`) : `backend.ts` en est l'unique
 * importateur (D7), donc mocker ici découple toute la chaîne du runtime natif.
 * AUCUN accès réseau : `check()` ne part jamais sur un endpoint réel — c'est la
 * condition posée par l'instruction, et la raison pour laquelle ces tests
 * tournent identiquement box allumée ou éteinte.
 *
 * Écart assumé avec l'instruction : le fichier vit dans `src/__tests__/`
 * (convention de CE dépôt : 78 suites y sont regroupées) et non dans
 * `src/hooks/__tests__/` — le glob vitest couvre les deux, on ne crée pas une
 * seconde convention pour un seul fichier.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, render, screen, cleanup } from "@testing-library/react";

// `backend.ts` importe le cœur Tauri : on le neutralise (aucun contexte natif ici).
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

const h = vi.hoisted(() => ({
  checkMock: vi.fn(),
  relaunchMock: vi.fn(),
  getVersionMock: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-updater", () => ({ check: () => h.checkMock() }));
vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: () => h.relaunchMock(),
}));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: () => h.getVersionMock() }));

import { useAppUpdate, STARTUP_CHECK_DELAY_MS } from "../hooks/useAppUpdate";
import { UpdateBanner } from "../components/UpdateBanner";

/** Événements de progression du plugin, tels qu'il les émet réellement. */
type DownloadEvent =
  | { event: "Started"; data: { contentLength?: number } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" };

/**
 * Fabrique un `Update` factice au contrat du plugin. `order` reçoit la trace des
 * appels : c'est elle qui prouve l'ORDRE download → relaunch.
 */
function makeUpdate(order: string[], version = "0.31.3") {
  return {
    version,
    currentVersion: "0.31.2",
    date: "2026-08-06T10:00:00Z",
    body: "notes de version",
    downloadAndInstall: vi.fn(
      async (onEvent?: (e: DownloadEvent) => void): Promise<void> => {
        order.push("downloadAndInstall");
        onEvent?.({ event: "Started", data: { contentLength: 100 } });
        onEvent?.({ event: "Progress", data: { chunkLength: 40 } });
        onEvent?.({ event: "Progress", data: { chunkLength: 60 } });
        onEvent?.({ event: "Finished" });
      },
    ),
  };
}

beforeEach(() => {
  h.checkMock.mockReset();
  h.relaunchMock.mockReset();
  h.getVersionMock.mockReset();
  h.getVersionMock.mockResolvedValue("0.31.2");
  h.relaunchMock.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useAppUpdate — contrôle de version", () => {
  /**
   * C3, MOITIÉ FRONT SEULEMENT. Ce test couvre le seul maillon qui vit ici :
   * `checkUpdate()` ne rend rien ⇒ état `up-to-date` ⇒ aucun bandeau.
   *
   * CE QU'IL NE COUVRE PAS, et ne peut pas couvrir : la DÉCISION « version égale
   * ou inférieure ⇒ rien à proposer ». Cette comparaison sémantique appartient à
   * `tauri-plugin-updater`, côté Rust, et s'exécute AVANT que le front ne voie
   * quoi que ce soit. Mocker `check()` pour qu'il renvoie `null`, c'est POSTULER
   * son résultat, pas l'éprouver : ce test ne prouve donc rien sur la comparaison
   * elle-même. Le pendant « égale ou inférieure » de C3 se recette en réel, sur
   * un manifeste servi localement (cf. C3/C5 et § Gates humains de L34).
   */
  it("check() renvoie null → état up-to-date, et AUCUN bandeau", async () => {
    h.checkMock.mockResolvedValue(null);
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.check(true);
    });
    expect(result.current.state).toEqual({ status: "up-to-date" });

    const { container } = render(
      <UpdateBanner
        state={result.current.state}
        dismissed={false}
        onInstall={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(container.querySelector(".updbanner")).toBeNull();
  });

  it("check() renvoie une version supérieure → état available, version exposée TELLE QUELLE", async () => {
    h.checkMock.mockResolvedValue(makeUpdate([], "0.31.3"));
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.check(true);
    });
    expect(result.current.state).toEqual({
      status: "available",
      version: "0.31.3",
      notes: "notes de version",
    });
    // Le hook ne reformate ni ne compare les versions : c'est le plugin qui décide.
    render(
      <UpdateBanner
        state={result.current.state}
        dismissed={false}
        onInstall={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText("Version 0.31.3 disponible")).toBeTruthy();
  });

  it("le front ne compare AUCUNE version : il expose la décision du plugin telle quelle", async () => {
    // Corollaire de la note ci-dessus, et ce qui EST vérifiable en unitaire : le
    // front ne rejoue pas la comparaison sémantique. On lui annonce une version
    // INFÉRIEURE à la version installée (0.30.0 < 0.31.2) — il la propose quand
    // même, parce qu'il ne juge pas. C'est la frontière, mesurée : aucune règle de
    // comparaison n'est dupliquée ici, donc aucune ne peut y diverger de celle du
    // plugin. Si un jour ce test devenait rouge, c'est qu'on aurait ajouté une
    // comparaison côté front — le vrai risque que ce test surveille.
    h.checkMock.mockResolvedValue(makeUpdate([], "0.30.0"));
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.check(true);
    });
    expect(result.current.state).toEqual({
      status: "available",
      version: "0.30.0",
      notes: "notes de version",
    });
    render(
      <UpdateBanner
        state={result.current.state}
        dismissed={false}
        onInstall={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText("Version 0.30.0 disponible")).toBeTruthy();
  });

  it("check() rejette en mode DÉMARRAGE → error invisible, UNE seule trace, rien à l'écran", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.checkMock.mockRejectedValue(new Error("box injoignable"));
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.check(false);
    });
    expect(result.current.state).toEqual({
      status: "error",
      message: "box injoignable",
      visible: false,
    });
    // Une trace, une seule.
    expect(warn).toHaveBeenCalledTimes(1);
    // Et rien du tout à l'écran : une box éteinte ne se voit pas (C2).
    const { container } = render(
      <UpdateBanner
        state={result.current.state}
        dismissed={false}
        onInstall={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(container.querySelector(".updbanner")).toBeNull();
  });

  it("check() rejette en mode MANUEL (verbose) → error marquée VISIBLE", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    h.checkMock.mockRejectedValue(new Error("box injoignable"));
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.check(true);
    });
    expect(result.current.state).toEqual({
      status: "error",
      message: "box injoignable",
      visible: true,
    });
  });

  it("le contrôle au démarrage est DIFFÉRÉ et non bloquant", async () => {
    vi.useFakeTimers();
    h.checkMock.mockResolvedValue(null);
    renderHook(() => useAppUpdate());
    // Rien juste après le montage : l'app démarre sans attendre le réseau.
    expect(h.checkMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(STARTUP_CHECK_DELAY_MS);
    });
    expect(h.checkMock).toHaveBeenCalledTimes(1);
  });
});

describe("useAppUpdate — installation (D3 : jamais sans clic)", () => {
  it("install() appelle downloadAndInstall PUIS relaunch, dans cet ordre, une seule fois", async () => {
    const order: string[] = [];
    const update = makeUpdate(order);
    h.relaunchMock.mockImplementation(async () => {
      order.push("relaunch");
    });
    h.checkMock.mockResolvedValue(update);

    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.check(true);
    });
    await act(async () => {
      await result.current.install();
    });

    expect(order).toEqual(["downloadAndInstall", "relaunch"]);
    expect(update.downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(h.relaunchMock).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ status: "ready", version: "0.31.3" });
  });

  it("double clic sur « Installer » → downloadAndInstall appelé UNE SEULE fois", async () => {
    const update = makeUpdate([]);
    h.checkMock.mockResolvedValue(update);
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.check(true);
    });
    await act(async () => {
      await Promise.all([result.current.install(), result.current.install()]);
    });
    expect(update.downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(h.relaunchMock).toHaveBeenCalledTimes(1);
  });

  it("rien ne s'installe tant qu'aucun contrôle n'a trouvé de version", async () => {
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.install();
    });
    expect(h.relaunchMock).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("la progression cumule les DELTAS du plugin (chunkLength → octets puis pourcentage)", async () => {
    // Le plugin n'émet que des deltas : sans cumul, le bandeau afficherait 75 %
    // au lieu de 100 % à la fin. On observe l'état RÉEL du hook pendant le
    // téléchargement, en tenant la promesse ouverte entre deux chunks.
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let emit!: (e: DownloadEvent) => void;

    h.checkMock.mockResolvedValue({
      version: "0.31.3",
      currentVersion: "0.31.2",
      date: null,
      body: null,
      downloadAndInstall: async (onEvent?: (e: DownloadEvent) => void) => {
        emit = (e) => onEvent?.(e);
        emit({ event: "Started", data: { contentLength: 200 } });
        await gate;
      },
    });

    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.check(true);
    });

    let installed!: Promise<void>;
    await act(async () => {
      installed = result.current.install();
      await Promise.resolve();
    });
    expect(result.current.state).toEqual({
      status: "downloading",
      version: "0.31.3",
      downloaded: 0,
      contentLength: 200,
      pct: 0,
    });

    await act(async () => {
      emit({ event: "Progress", data: { chunkLength: 50 } });
    });
    expect(result.current.state).toMatchObject({ downloaded: 50, pct: 25 });

    await act(async () => {
      emit({ event: "Progress", data: { chunkLength: 150 } });
    });
    // 150 est un DELTA : le cumul doit donner 200/200 = 100 %, pas 150/200 = 75 %.
    expect(result.current.state).toMatchObject({ downloaded: 200, pct: 100 });

    await act(async () => {
      release();
      await installed;
    });
    expect(result.current.state).toEqual({ status: "ready", version: "0.31.3" });
  });
});

describe("UpdateBanner — discret et non modal", () => {
  it("ne rend rien une fois fermé (D3 : fermer n'installe rien)", () => {
    const { container } = render(
      <UpdateBanner
        state={{ status: "available", version: "1.0.0", notes: null }}
        dismissed
        onInstall={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(container.querySelector(".updbanner")).toBeNull();
  });

  it("affiche la progression pendant le téléchargement et désactive la fermeture", () => {
    render(
      <UpdateBanner
        state={{
          status: "downloading",
          version: "1.0.0",
          downloaded: 25,
          contentLength: 100,
          pct: 25,
        }}
        dismissed={false}
        onInstall={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText("Téléchargement… 25 %")).toBeTruthy();
    const close = screen.getByLabelText("Fermer le bandeau de mise à jour");
    expect((close as HTMLButtonElement).disabled).toBe(true);
  });
});
