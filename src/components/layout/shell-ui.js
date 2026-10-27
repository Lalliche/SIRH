"use client";

import { useSyncExternalStore } from "react";

// Tiny UI store for the app shell: sidebar rail, mobile drawer, command palette, assistant panel.
// Other modules can open things from anywhere: `import { shell } from "@/components/layout/shell-ui"`.

const KEY = "sirh:sidebar";
const INITIAL = { collapsed: false, mobileNav: false, palette: false, assistant: false, seed: null };
let state = INITIAL;
let loaded = false;
const listeners = new Set();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    if (window.localStorage.getItem(KEY) === "1") state = { ...state, collapsed: true };
  } catch {
    /* storage blocked: default expanded */
  }
}

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Selector must return a primitive / stable value. */
export function useShell(selector) {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return selector(state);
    },
    () => selector(INITIAL),
  );
}

let seedId = 0;

export const shell = {
  toggleSidebar() {
    load();
    const collapsed = !state.collapsed;
    try {
      window.localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ collapsed });
  },
  openNav: () => set({ mobileNav: true }),
  closeNav: () => set({ mobileNav: false }),
  openPalette: () => set({ palette: true }),
  closePalette: () => set({ palette: false }),
  togglePalette: () => set({ palette: !state.palette }),
  /** Opens the slide-over (unless `panel:false`) and optionally queues a question for the chat to send. */
  openAssistant: (question, { panel = true } = {}) => set({ assistant: panel ? true : state.assistant, seed: question ? { id: ++seedId, text: question } : state.seed }),
  closeAssistant: () => set({ assistant: false }),
  consumeSeed: () => set({ seed: null }),
};
