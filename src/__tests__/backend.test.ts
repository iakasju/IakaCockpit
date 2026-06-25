import { describe, it, expect, vi, beforeEach } from "vitest";

// On mocke le coeur Tauri : `backend.ts` est l'unique point qui l'importe, donc
// mocker ici suffit pour découpler toute l'app du runtime natif (D7).
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) =>
    invokeMock(cmd, args),
}));

import {
  call,
  isTauri,
  backend,
  scanPortfolio,
  checkServices,
  getRoot,
  setRoot,
  configGet,
  configSet,
  configAll,
  ptyOpen,
  ptyWrite,
  ptyResize,
  ptyClose,
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
    ] as const) {
      expect(typeof backend[fn]).toBe("function");
    }
  });
});
