"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useCollection } from "@/lib/db";

// "Entité / site" filter of the top bar. Purely a UI value: pages decide whether to apply it.
//   const { entityId, isAll, matches } = useEntityFilter();
//   rows.filter((e) => matches(e.entityId))

const KEY = "sirh:entity";
export const ALL_ENTITIES = "all";
let current = ALL_ENTITIES;
let loaded = false;
const listeners = new Set();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    current = window.localStorage.getItem(KEY) || ALL_ENTITIES;
  } catch {
    /* ignore */
  }
}

export function setEntityFilter(id) {
  current = id || ALL_ENTITIES;
  try {
    window.localStorage.setItem(KEY, current);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useEntityFilter() {
  const entityId = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return current;
    },
    () => ALL_ENTITIES,
  );
  const entities = useCollection("entities");
  const entity = useMemo(() => entities.find((e) => e.id === entityId) ?? null, [entities, entityId]);
  const isAll = !entity;
  const matches = useCallback((id) => isAll || id === entity?.id, [isAll, entity]);
  return { entityId: entity ? entityId : ALL_ENTITIES, entity, isAll, matches, setEntityId: setEntityFilter };
}
