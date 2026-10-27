"use client";

import { useMemo } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useCollection } from "@/lib/db";
import { int } from "@/lib/format";
import { Popover, MenuItem, MenuLabel } from "./Popover";
import { ALL_ENTITIES, useEntityFilter } from "./entity-filter";

/** Entity / site filter (UI value only; see useEntityFilter). */
export function EntitySwitcher({ block = false, placement, align = "start" }) {
  const { entityId, entity, setEntityId } = useEntityFilter();
  const entities = useCollection("entities");
  const employees = useCollection("employees");
  const counts = useMemo(() => {
    const c = {};
    for (const e of employees) if (e.status !== "sorti") c[e.entityId] = (c[e.entityId] ?? 0) + 1;
    return c;
  }, [employees]);
  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  const options = [{ id: ALL_ENTITIES, name: "Toute l'entreprise", detail: `${int(total)} salariés · ${entities.length} sites` }, ...entities.map((e) => ({ id: e.id, name: e.name, detail: `${e.city} · ${int(counts[e.id] ?? 0)} salariés` }))];

  return (
    <Popover
      placement={placement}
      align={align}
      className={block ? "w-full" : undefined}
      panelClassName="w-[19em]"
      trigger={(p) => (
        <Button variant="secondary" size="sm" icon={Building2} iconEnd={ChevronsUpDown} aria-label={`Entité : ${entity?.name ?? "Toute l'entreprise"}`} className={cn(block && "w-full justify-between")} {...p}>
          <span className="max-w-[11em] truncate">{entity?.name ?? "Toute l'entreprise"}</span>
        </Button>
      )}
    >
      {(close) => (
        <div className="p-[0.35em]">
          <MenuLabel>Entité / site</MenuLabel>
          {options.map((o) => (
            <MenuItem
              key={o.id}
              selected={o.id === entityId}
              onClick={() => {
                setEntityId(o.id);
                close();
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875em] font-medium">{o.name}</span>
                <span className="block truncate text-xs text-fg-muted">{o.detail}</span>
              </span>
              {o.id === entityId && <Check className="size-[1.1em] shrink-0" aria-hidden />}
            </MenuItem>
          ))}
        </div>
      )}
    </Popover>
  );
}
