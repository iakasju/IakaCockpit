/**
 * useHandoff — AUTORITÉ de la RÉCEPTION d'un handoff (H1), séparé de `useTeams` (l'autorité du
 * roster). Réceptionner = lire un paquet livré par la forge dans le canal partagé → l'importer
 * dans le roster (`useTeams`, via `importTeam` injecté) → stocker la **provenance** (config non
 * sensible) → garder l'anti-dérive (badge « modifié localement » + conflit explicite au ré-import).
 *
 * Non destructif & idempotent : ré-importer le MÊME paquet (même empreinte) ne modifie rien.
 * Anti-dérive : si des éditions locales existent ET qu'une NOUVELLE livraison arrive (empreinte
 * différente) → **conflit explicite** (garder local / prendre la forge / différer), jamais
 * d'écrasement silencieux. La façade unique (`api.handoffRead`/`handoffList`/`nowMillis`) est
 * mockée hors Tauri ; on ne casse jamais le rendu.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { backend, type Backend } from "../api/backend";
import type { Team } from "./useTeams";
import {
  buildProvenance,
  detectConflict,
  forgeTeamToCockpit,
  parseForgeTeam,
  parseManifest,
  parseProvenance,
  serializeProvenance,
  HANDOFF_PROVENANCE_PREFIX,
  type HandoffManifest,
  type HandoffProvenance,
} from "../handoff/receive";

/** Choix de l'humain face à un conflit de dérive (§ 5 anti-dérive). */
export type ConflictResolution = "take-forge" | "keep-local" | "defer";

/** Issue d'une tentative d'import (jamais d'exception, jamais d'écrasement silencieux). */
export type ImportOutcome =
  | { status: "imported"; teamId: string; provenance: HandoffProvenance }
  | { status: "unchanged"; teamId: string; provenance: HandoffProvenance | null }
  | {
      status: "conflict";
      teamId: string;
      existing: HandoffProvenance;
      incoming: HandoffManifest;
    }
  | { status: "invalid"; teamId: string; reason: string };

export interface UseHandoff {
  /** Livraisons disponibles dans le canal (team_ids). */
  deliveries: string[];
  loading: boolean;
  /** Provenance connue par team réceptionnée. */
  provenance: Record<string, HandoffProvenance>;
  /** Relit le canal + les provenances stockées. */
  refresh: () => Promise<void>;
  /** Réceptionne une livraison ; `resolution` fournie tranche un conflit. */
  importDelivery: (
    teamId: string,
    resolution?: ConflictResolution,
  ) => Promise<ImportOutcome>;
  /** Marque une team réceptionnée comme éditée localement (1re édition → badge). No-op sinon. */
  markLocalEdit: (teamId: string) => Promise<void>;
  /** Provenance d'une team (ou `null` si non réceptionnée). */
  provenanceFor: (teamId: string) => HandoffProvenance | null;
}

export interface UseHandoffDeps {
  api?: Backend;
  /** Import dans le roster (fourni par `useTeams.upsertTeam`) — non destructif, upsert. */
  importTeam: (team: Team) => Promise<void>;
}

function provKey(teamId: string): string {
  return HANDOFF_PROVENANCE_PREFIX + teamId;
}

export function useHandoff(deps: UseHandoffDeps): UseHandoff {
  const api = deps.api ?? backend;
  const { importTeam } = deps;

  const importTeamRef = useRef(importTeam);
  importTeamRef.current = importTeam;

  const [deliveries, setDeliveries] = useState<string[]>([]);
  const [provenance, setProvenance] = useState<Record<string, HandoffProvenance>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const provenanceRef = useRef(provenance);
  provenanceRef.current = provenance;

  /** Charge les provenances depuis la config (clés `handoff:*`). */
  const loadProvenance = useCallback(async (): Promise<
    Record<string, HandoffProvenance>
  > => {
    let cfg: Record<string, string> = {};
    try {
      cfg = await api.configAll();
    } catch {
      cfg = {};
    }
    const out: Record<string, HandoffProvenance> = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (!k.startsWith(HANDOFF_PROVENANCE_PREFIX)) continue;
      const p = parseProvenance(v);
      if (p) out[p.teamId] = p;
    }
    return out;
  }, [api]);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    let list: string[] = [];
    try {
      list = await api.handoffList();
    } catch {
      list = [];
    }
    const prov = await loadProvenance();
    setDeliveries(list);
    setProvenance(prov);
    setLoading(false);
  }, [api, loadProvenance]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Persiste une provenance (config non sensible) + met à jour l'état. */
  const persistProvenance = useCallback(
    async (p: HandoffProvenance): Promise<void> => {
      try {
        await api.configSet(provKey(p.teamId), serializeProvenance(p));
      } catch {
        /* hors Tauri / test sans backend : l'état mémoire suffit */
      }
      setProvenance((prev) => ({ ...prev, [p.teamId]: p }));
    },
    [api],
  );

  const importDelivery = useCallback(
    async (teamId: string, resolution?: ConflictResolution): Promise<ImportOutcome> => {
      // 1. Lire le paquet dans le canal.
      let raw: { team_json: string | null; handoff_json: string | null };
      try {
        raw = await api.handoffRead(teamId);
      } catch (e) {
        return {
          status: "invalid",
          teamId,
          reason: e instanceof Error ? e.message : String(e),
        };
      }
      const forge = parseForgeTeam(raw.team_json);
      const manifest = parseManifest(raw.handoff_json);
      if (!forge || !manifest) {
        return { status: "invalid", teamId, reason: "paquet incomplet ou illisible" };
      }

      const existing = provenanceRef.current[teamId] ?? null;

      // 2. Anti-dérive : conflit si édition locale + empreinte changée.
      const conflict = detectConflict(existing, manifest.originHash);
      if (conflict && !resolution) {
        return { status: "conflict", teamId, existing: existing!, incoming: manifest };
      }
      if (conflict && (resolution === "keep-local" || resolution === "defer")) {
        // On NE touche à rien : les éditions locales restent, la forge est ignorée pour l'instant.
        return { status: "unchanged", teamId, provenance: existing };
      }

      // 3. Idempotence : même empreinte déjà réceptionnée → aucune modification.
      if (existing && existing.originHash === manifest.originHash) {
        return { status: "unchanged", teamId, provenance: existing };
      }

      // 4. Import (nouvelle team, nouvelle livraison, ou « prendre la forge » sur conflit).
      const cockpitTeam = forgeTeamToCockpit(forge);
      await importTeamRef.current(cockpitTeam);

      // 5. Provenance fraîche (localEdits repart à false — on est aligné sur la forge).
      let importedAt = "";
      try {
        importedAt = new Date(await api.nowMillis()).toISOString();
      } catch {
        importedAt = manifest.timestamp; // repli : au moins l'horodatage forge
      }
      const prov = buildProvenance(manifest, importedAt, raw.team_json ?? "");
      await persistProvenance(prov);
      return { status: "imported", teamId, provenance: prov };
    },
    [api, persistProvenance],
  );

  const markLocalEdit = useCallback(
    async (teamId: string): Promise<void> => {
      const existing = provenanceRef.current[teamId];
      if (!existing || existing.localEdits) return; // non réceptionnée, ou déjà marquée
      await persistProvenance({ ...existing, localEdits: true });
    },
    [persistProvenance],
  );

  const provenanceFor = useCallback(
    (teamId: string): HandoffProvenance | null =>
      provenanceRef.current[teamId] ?? null,
    [],
  );

  return useMemo(
    () => ({
      deliveries,
      loading,
      provenance,
      refresh,
      importDelivery,
      markLocalEdit,
      provenanceFor,
    }),
    [deliveries, loading, provenance, refresh, importDelivery, markLocalEdit, provenanceFor],
  );
}
