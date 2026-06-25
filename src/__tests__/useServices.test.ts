import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useServices } from "../hooks/useServices";
import type { Backend, ServiceStatus } from "../api/backend";

const up: ServiceStatus = {
  name: "forgejo",
  host: "192.168.2.11",
  port: 3001,
  url: "http://192.168.2.11:3001",
  reachable: true,
  latency_ms: 12,
};
const down: ServiceStatus = { ...up, name: "litellm", reachable: false, latency_ms: null };

function api(impl: () => Promise<ServiceStatus[]>): Backend {
  return { checkServices: vi.fn(impl) } as unknown as Backend;
}

describe("useServices (dégradation hors box)", () => {
  it("charge les services au montage", async () => {
    const { result } = renderHook(() => useServices(api(async () => [up, down])));
    await waitFor(() => expect(result.current.services).toEqual([up, down]));
  });

  it("ne bloque jamais : un rejet retombe sur une liste vide", async () => {
    const fail = api(async () => Promise.reject(new Error("hors box")));
    const { result } = renderHook(() => useServices(fail));
    // Laisse le micro-task de rejet se résoudre, puis vérifie la garde.
    await waitFor(() => expect(fail.checkServices).toHaveBeenCalled());
    expect(result.current.services).toEqual([]);
  });
});
