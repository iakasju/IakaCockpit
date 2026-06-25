/**
 * useServices — état des services iakabox (checkServices), avec dégradation.
 *
 * `checkServices()` ne rejette JAMAIS (L1) : hors box, les services remontent
 * `reachable:false`. Le hook expose l'état + un rafraîchissement manuel ; aucune
 * erreur n'est bloquante (R-L2-7). Hook optionnel (D4 bloc services recommandé).
 */
import { useCallback, useEffect, useState } from "react";
import { backend, type Backend, type ServiceStatus } from "../api/backend";

export interface UseServices {
  services: ServiceStatus[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useServices(api: Backend = backend): UseServices {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setServices(await api.checkServices());
    } catch {
      // Garde : checkServices ne devrait pas rejeter, mais on ne bloque jamais.
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { services, loading, refresh };
}
