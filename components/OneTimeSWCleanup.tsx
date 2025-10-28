"use client";
import { useEffect } from "react";

export default function OneTimeSWCleanup() {
  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator)) return;
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        // If the scope looks wrong (not root), you could conditionally unregister.
        // For now we won't auto-unregister. Keep as reference:
        // if (!r.scope.endsWith("/")) await r.unregister();
      }
    })();
  }, []);
  return null;
}

