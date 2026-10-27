"use client";

import { useSyncExternalStore } from "react";
import { SEED, SEED_VERSION, createSeed } from "@/data/seed";

// localStorage-backed store for the whole prototype. No backend.
// Rules for selectors: they must return a STABLE reference (a slice of state), never a freshly derived value.
// Derive inside useMemo from the slice.

const KEY = "sirh:db:v1";
let state = SEED;
let loaded = false;
const listeners = new Set();
let saveTimer = null;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.version === SEED_VERSION) state = parsed;
  } catch {
    /* corrupted storage → fall back to seed */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode: keep in-memory only */
    }
  }, 150);
}

function emit() {
  listeners.forEach((l) => l());
  persist();
}

function subscribe(listener) {
  load();
  listeners.add(listener);
  const onStorage = (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        const next = JSON.parse(e.newValue);
        if (next?.version === SEED_VERSION) {
          state = next;
          listeners.forEach((l) => l());
        }
      } catch {}
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => {
  load();
  return state;
};
const getServerSnapshot = () => SEED;

/** Whole-state hook. Prefer useCollection / useDb(selector). */
export function useDb(selector = (s) => s) {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  );
}

export const useCollection = (key) => useDb((s) => s[key]);

export const getState = () => getSnapshot();

let seq = 1000;
export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Mutations — all immutable updates, persisted to localStorage. */
export const db = {
  set(key, value) {
    state = { ...state, [key]: value };
    emit();
  },
  update(key, fn) {
    state = { ...state, [key]: fn(state[key]) };
    emit();
  },
  insert(key, item, { prepend = false } = {}) {
    state = { ...state, [key]: prepend ? [item, ...state[key]] : [...state[key], item] };
    emit();
    return item;
  },
  patch(key, id, patch) {
    state = {
      ...state,
      [key]: state[key].map((x) => (x.id === id ? { ...x, ...(typeof patch === "function" ? patch(x) : patch) } : x)),
    };
    emit();
  },
  remove(key, id) {
    state = { ...state, [key]: state[key].filter((x) => x.id !== id) };
    emit();
  },
  patchSettings(patch) {
    state = { ...state, settings: { ...state.settings, ...patch } };
    emit();
  },
  audit(actorId, action, target, detail = "") {
    const entry = { id: newId("au"), at: new Date().toISOString().slice(0, 19), actorId, action, target, detail };
    state = { ...state, audit: [entry, ...state.audit] };
    emit();
  },
  notify(n) {
    const entry = { id: newId("nt"), date: new Date().toISOString().slice(0, 10), read: false, roles: ["admin", "hr", "manager", "accountant", "employee"], ...n };
    state = { ...state, notifications: [entry, ...state.notifications] };
    emit();
  },
  reset() {
    state = createSeed();
    emit();
  },
};

/** Convenient lookups (call inside useMemo). */
export const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
