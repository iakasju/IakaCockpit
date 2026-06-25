import { describe, it, expect, vi, beforeEach } from "vitest";

// On mocke le coeur Tauri : `backend.ts` est l'unique point qui l'importe, donc
// mocker ici suffit pour découpler toute l'app du runtime natif (D7).
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) =>
    invokeMock(cmd, args),
}));

// L2 : `backend.ts` est aussi le seul point qui importe `@tauri-apps/api/event`
// (helpers d'abonnement PTY). On le mocke ici pour la même raison (D6/D7).
const listenMock = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
  listen: (event: string, cb: (e: { payload: unknown }) => void) =>
    listenMock(event, cb),
}));

// `backend.ts` est aussi le seul point qui importe le plugin dialog (sélecteur de
// dossier natif du bouton +). On le mocke ici pour la même raison de cloisonnement.
const openDialogMock = vi.fn();
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (opts?: unknown) => openDialogMock(opts),
}));

import {
  call,
  isTauri,
  backend,
  scanPortfolio,
  addProject,
  listExtraProjects,
  pickDirectory,
  checkServices,
  getRoot,
  setRoot,
  configGet,
  configSet,
  configAll,
  nextStep,
  aiSetKey,
  aiHasKey,
  ptyOpen,
  ptyWrite,
  ptyResize,
  ptyClose,
  onPtyOutput,
  onPtyClosed,
} from "../api/backend";

describe("backend.ts (couche d'abstraction unique)", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("call() délègue au invoke Tauri avec commande et args", async () => {
    invokeMock.mockResolvedValue("pong");
    const res = await call<string>("ping", { foo: 1 });
    expect(invokeMock).toHaveBeenCalledWith("ping", { foo: 1 });
    expect(res).toBe("pong");
  });

  it("call() propage les types de retour", async () => {
    invokeMock.mockResolvedValue(42);
    const res = await call<number>("answer");
    expect(res).toBe(42);
  });

  it("isTauri() est false hors contexte Tauri (jsdom)", () => {
    expect(isTauri()).toBe(false);
  });

  it("la façade backend expose call et isTauri", () => {
    expect(typeof backend.call).toBe("function");
    expect(typeof backend.isTauri).toBe("function");
  });
});

describe("backend.ts (commandes métier L1)", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
  });

  it("scanPortfolio invoque scan_portfolio avec root", async () => {
    invokeMock.mockResolvedValue([]);
    await scanPortfolio("/home/u/work");
    expect(invokeMock).toHaveBeenCalledWith("scan_portfolio", {
      root: "/home/u/work",
    });
  });

  it("addProject invoque add_project avec path", async () => {
    invokeMock.mockResolvedValue({});
    await addProject("/home/u/work/proj");
    expect(invokeMock).toHaveBeenCalledWith("add_project", {
      path: "/home/u/work/proj",
    });
  });

  it("listExtraProjects invoque list_extra_projects sans args", async () => {
    invokeMock.mockResolvedValue([]);
    await listExtraProjects();
    expect(invokeMock).toHaveBeenCalledWith("list_extra_projects", undefined);
  });

  it("checkServices invoque check_services sans args", async () => {
    invokeMock.mockResolvedValue([]);
    await checkServices();
    expect(invokeMock).toHaveBeenCalledWith("check_services", undefined);
  });

  it("getRoot invoque get_root sans args", async () => {
    invokeMock.mockResolvedValue("/home/u/work");
    const r = await getRoot();
    expect(invokeMock).toHaveBeenCalledWith("get_root", undefined);
    expect(r).toBe("/home/u/work");
  });

  it("setRoot invoque set_root avec root", async () => {
    await setRoot("/x/work");
    expect(invokeMock).toHaveBeenCalledWith("set_root", { root: "/x/work" });
  });

  it("configGet invoque config_get avec key", async () => {
    invokeMock.mockResolvedValue("dark");
    await configGet("theme");
    expect(invokeMock).toHaveBeenCalledWith("config_get", { key: "theme" });
  });

  it("configSet invoque config_set avec key et value", async () => {
    await configSet("theme", "dark");
    expect(invokeMock).toHaveBeenCalledWith("config_set", {
      key: "theme",
      value: "dark",
    });
  });

  it("configAll invoque config_all sans args", async () => {
    invokeMock.mockResolvedValue({});
    await configAll();
    expect(invokeMock).toHaveBeenCalledWith("config_all", undefined);
  });

  it("ptyOpen invoque pty_open avec id/cwd/cols/rows", async () => {
    await ptyOpen("t1", "/home/u/work/proj", 100, 30);
    expect(invokeMock).toHaveBeenCalledWith("pty_open", {
      id: "t1",
      cwd: "/home/u/work/proj",
      cols: 100,
      rows: 30,
    });
  });

  it("ptyOpen tolère les optionnels absents", async () => {
    await ptyOpen("t2");
    expect(invokeMock).toHaveBeenCalledWith("pty_open", {
      id: "t2",
      cwd: undefined,
      cols: undefined,
      rows: undefined,
    });
  });

  it("ptyWrite invoque pty_write avec id et data", async () => {
    await ptyWrite("t1", "ls\n");
    expect(invokeMock).toHaveBeenCalledWith("pty_write", {
      id: "t1",
      data: "ls\n",
    });
  });

  it("ptyResize invoque pty_resize avec id/cols/rows", async () => {
    await ptyResize("t1", 120, 40);
    expect(invokeMock).toHaveBeenCalledWith("pty_resize", {
      id: "t1",
      cols: 120,
      rows: 40,
    });
  });

  it("ptyClose invoque pty_close avec id", async () => {
    await ptyClose("t1");
    expect(invokeMock).toHaveBeenCalledWith("pty_close", { id: "t1" });
  });

  it("la façade expose toutes les fonctions métier L1", () => {
    for (const fn of [
      "scanPortfolio",
      "addProject",
      "listExtraProjects",
      "pickDirectory",
      "checkServices",
      "getRoot",
      "setRoot",
      "configGet",
      "configSet",
      "configAll",
      "ptyOpen",
      "ptyWrite",
      "ptyResize",
      "ptyClose",
      "onPtyOutput",
      "onPtyClosed",
    ] as const) {
      expect(typeof backend[fn]).toBe("function");
    }
  });
});

describe("backend.ts (moteur prochaine étape — L3)", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
  });

  it("nextStep invoque next_step avec path et renvoie la suggestion", async () => {
    invokeMock.mockResolvedValue({
      suggestion: "Fais X.",
      provider: "mock",
      model: "llama3.1:8b",
      tokens_in: null,
      tokens_out: null,
    });
    const ns = await nextStep("/home/u/work/proj");
    expect(invokeMock).toHaveBeenCalledWith("next_step", {
      path: "/home/u/work/proj",
    });
    expect(ns.provider).toBe("mock");
    expect(ns.suggestion).toBe("Fais X.");
  });

  it("aiSetKey invoque ai_set_key avec value (write-only)", async () => {
    await aiSetKey("sk-secret");
    expect(invokeMock).toHaveBeenCalledWith("ai_set_key", { value: "sk-secret" });
  });

  it("aiHasKey invoque ai_has_key sans args et renvoie un booléen", async () => {
    invokeMock.mockResolvedValue(true);
    const has = await aiHasKey();
    expect(invokeMock).toHaveBeenCalledWith("ai_has_key", undefined);
    expect(has).toBe(true);
  });

  it("la façade n'expose AUCUNE commande de lecture de la clé (cloisonnement D4)", () => {
    // Présence des commandes attendues…
    for (const fn of ["nextStep", "aiSetKey", "aiHasKey"] as const) {
      expect(typeof backend[fn]).toBe("function");
    }
    // …et absence de toute commande qui lirait la valeur de la clé vers le front.
    const facade = backend as unknown as Record<string, unknown>;
    expect(facade["aiGetKey"]).toBeUndefined();
    expect(facade["getAiKey"]).toBeUndefined();
  });
});

describe("backend.ts (sélecteur de dossier natif — seul point dialog)", () => {
  beforeEach(() => {
    openDialogMock.mockReset();
  });

  it("pickDirectory ouvre le dialog en mode dossier et renvoie le chemin", async () => {
    openDialogMock.mockResolvedValue("/home/u/work/proj");
    const path = await pickDirectory();
    expect(openDialogMock).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
    });
    expect(path).toBe("/home/u/work/proj");
  });

  it("pickDirectory renvoie null si l'utilisateur annule", async () => {
    openDialogMock.mockResolvedValue(null);
    expect(await pickDirectory()).toBeNull();
  });
});

describe("backend.ts (abonnement PTY — DEP-5, seul point qui écoute)", () => {
  beforeEach(() => {
    listenMock.mockReset();
    listenMock.mockResolvedValue(() => undefined);
  });

  it("onPtyOutput écoute pty://output/{id} et mappe le payload", async () => {
    const cb = vi.fn();
    await onPtyOutput("t1", cb);
    expect(listenMock).toHaveBeenCalledWith(
      "pty://output/t1",
      expect.any(Function),
    );
    // Simule un événement émis par Rust : le payload doit ressortir.
    const handler = listenMock.mock.calls[0][1] as (e: {
      payload: string;
    }) => void;
    handler({ payload: "chunk" });
    expect(cb).toHaveBeenCalledWith("chunk");
  });

  it("onPtyClosed écoute pty://closed/{id}", async () => {
    const cb = vi.fn();
    await onPtyClosed("t1", cb);
    expect(listenMock).toHaveBeenCalledWith(
      "pty://closed/t1",
      expect.any(Function),
    );
    const handler = listenMock.mock.calls[0][1] as (e: {
      payload: void;
    }) => void;
    handler({ payload: undefined });
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
