import { useEffect } from "react";

/** Registers the service worker for offline local play (production-like hosts). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Skip noisy re-registers on every HMR in pure localhost tooling if needed;
    // still register so preview/deploy get offline shell.
    const id = window.setTimeout(() => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline shell optional */
      });
    }, 800);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
