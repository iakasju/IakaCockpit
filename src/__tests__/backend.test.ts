import { describe, it, expect, vi, beforeEach } from "vitest";

// On mocke le coeur Tauri : `backend.ts` est l'unique point qui l'importe, donc
// mocker ici suffit pour découpler toute l'app du runtime natif (D7).
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) =>
    invokeMock(cmd, args),
}));

import { call, isTauri, backend } from "../api/backend";

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
