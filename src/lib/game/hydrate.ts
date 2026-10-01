import { useEffect, useState } from "react";
import { useGameStore } from "./store";

/**
 * True after zustand persist has rehydrated from localStorage.
 * Always false on the server / first paint to avoid wrong redirects.
 */
export function useGameHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const api = useGameStore.persist;
    if (!api || typeof api.hasHydrated !== "function") {
      setHydrated(true);
      return;
    }
    if (api.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return api.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
