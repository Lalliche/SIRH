"use client";

import { useSyncExternalStore } from "react";

/** matchMedia as an external store: no setState-in-effect, SSR-safe via `serverFallback`. */
export function useMedia(query, serverFallback = false) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

/** True on devices with a real hover pointer (mouse / trackpad). */
export const useCanHover = () => useMedia("(hover: hover) and (pointer: fine)");
