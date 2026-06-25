/**
 * useWorkset — « set de Work » : projets sélectionnés pour ouverture dans Working.
 *
 * État FRONT pur (un Set d'ids), D2/D6. La persistance backend
 * (`configSet("workset", …)`) est un PLUS non bloquant (PO-2) — non implémentée
 * en L2 pour rester MVP. Aucun I/O ici.
 */
import { useCallback, useState } from "react";

export interface UseWorkset {
  ids: ReadonlySet<string>;
  toggle: (projectId: string) => void;
  has: (projectId: string) => boolean;
}

export function useWorkset(): UseWorkset {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((projectId: string): void => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const has = useCallback(
    (projectId: string): boolean => ids.has(projectId),
    [ids],
  );

  return { ids, toggle, has };
}
