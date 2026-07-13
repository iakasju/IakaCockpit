/**
 * useAgentAttribution — attribution par agent RÉELLE (tokens + coût $ par agent nommé, L30-P3)
 * sur une plage de temps + un scope projet, depuis la façade `agentAttribution` (Rust : lit les
 * transcripts sous-agents via `toolUseResult.outputFile` + `resolvedModel`). RANGE + SCOPE-AWARE :
 * re-fetch quand bornes OU projet changent (calque `usePortfolioCost`). Le front ne lit AUCUN
 * fichier (garde CSP/D7). Dégradé toléré : hors-Tauri / échec → `null` (V4/V1 retombent sur
 * placeholder / démo dev).
 */
import { useEffect, useState } from "react";
import { backend, type Backend, type AgentAttribution } from "../api/backend";

export function useAgentAttribution(
  fromMs: number,
  toMs: number,
  project?: string,
  api: Backend = backend,
): AgentAttribution | null {
  const [attrib, setAttrib] = useState<AgentAttribution | null>(null);

  useEffect(() => {
    if (!api.isTauri()) {
      setAttrib(null);
      return;
    }
    let alive = true;
    api
      .agentAttribution(fromMs, toMs, project)
      .then((a) => {
        if (alive) setAttrib(a);
      })
      .catch(() => {
        if (alive) setAttrib(null);
      });
    return () => {
      alive = false;
    };
  }, [api, fromMs, toMs, project]);

  return attrib;
}
