"use client";

import { useSyncExternalStore } from "react";

// Theme lives on <html data-theme> (set before paint by ThemeScript) and in localStorage "sirh:theme".

const KEY = "sirh:theme";

function subscribe(cb) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const read = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "light");
  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
