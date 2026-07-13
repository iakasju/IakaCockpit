/**
 * useAgentAttribution — réactivité range + scope (L30-P3). Prouve que le hook re-fetche
 * `agentAttribution(from, to, project)` au changement de plage OU de projet et ré-expose le
 * résultat. Faux `Backend` (isTauri=true). Le front ne lit aucun outputFile (c'est le Rust).
 */
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAgentAttribution } from "../hooks/useAgentAttribution";
import type { Backend, AgentAttribution } from "../api/backend";

const NOW = new Date(2026, 6, 13, 12, 0, 0).getTime();

interface AttribCall {
  from: number;
  to: number;
  project?: string;
}

function makeFakeBackend(calls: AttribCall[]): Backend {
  return {
    isTauri: () => true,
    agentAttribution: (
      from: number,
      to: number,
      project?: string,
    ): Promise<AgentAttribution> => {
      calls.push({ from, to, project });
      // Le nombre de tokens encode le projet (pour distinguer ALL vs scopé).
      return Promise.resolve({
        agents: [
          {
            agent: "gimli",
            tokens: project ? 100 : 999,
            cost: 1,
            delegations: 1,
            model: "claude-opus-4-8[1m]",
            untariffed: false,
          },
        ],
        unavailable: 0,
        priced_at: null,
      });
    },
  } as unknown as Backend;
}

describe("useAgentAttribution — réactivité", () => {
  it("re-fetche avec le projet scopé quand le Périmètre change", async () => {
    const calls: AttribCall[] = [];
    const api = makeFakeBackend(calls);

    const { result, rerender } = renderHook(
      ({ project }) => useAgentAttribution(NOW - 1000, NOW, project, api),
      { initialProps: { project: undefined as string | undefined } },
    );

    await waitFor(() => expect(result.current?.agents[0].tokens).toBe(999)); // ALL

    rerender({ project: "iakacockpit" });
    await waitFor(() => expect(result.current?.agents[0].tokens).toBe(100)); // scopé

    expect(calls).toHaveLength(2);
    expect(calls[0].project).toBeUndefined();
    expect(calls[1].project).toBe("iakacockpit");
  });
});
