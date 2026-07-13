/**
 * useDelegationsByAgent — délégations RÉELLES par agent nommé (L30-P2) sur une plage de temps,
 * depuis la façade `delegationsByAgent` (Rust : `tool_use "Agent"`/`"Task"` appariés à leur
 * `tool_result`). RANGE-AWARE : re-fetch quand les bornes changent. Comptes + durées seulement
 * (PAS de tokens/$ par agent — pas de source, cf. constat transcript). Dégradé toléré :
 * hors-Tauri / échec → `null` (le KPI délégations / la vue par-agent retombent sur placeholder).
 */
import { useEffect, useState } from "react";
import { backend, type Backend, type AgentDelegations } from "../api/backend";

export function useDelegationsByAgent(
  fromMs: number,
  toMs: number,
  project?: string,
  api: Backend = backend,
): AgentDelegations[] | null {
  const [rows, setRows] = useState<AgentDelegations[] | null>(null);

  useEffect(() => {
    if (!api.isTauri()) {
      setRows(null);
      return;
    }
    let alive = true;
    api
      .delegationsByAgent(fromMs, toMs, project)
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch(() => {
        if (alive) setRows(null);
      });
    return () => {
      alive = false;
    };
  }, [api, fromMs, toMs, project]);

  return rows;
}
