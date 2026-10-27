"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Eye } from "lucide-react";
import { Avatar, Button, toast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useCollection } from "@/lib/db";
import { fullName } from "@/lib/format";
import { PERSONAS, ROLES } from "@/data/constants";
import { setSession } from "@/lib/session";
import { useCurrentUser } from "@/lib/use-current-user";
import { Popover, MenuItem, MenuLabel } from "./Popover";
import { routeAccess } from "./shell-utils";

/** "Voir en tant que" — demo-only persona switcher. */
export function RoleSwitcher({ block = false, compact = false, placement, align = "end" }) {
  const router = useRouter();
  const pathname = usePathname();
  const employees = useCollection("employees");
  const { role, employee } = useCurrentUser();
  const personas = useMemo(() => PERSONAS.map((p) => ({ ...p, employee: employees.find((e) => e.id === p.employeeId) })), [employees]);

  const choose = (persona, close) => {
    close();
    if (persona.role === role) return;
    setSession(persona.role);
    toast.info(`Vous voyez SIRH en tant que ${fullName(persona.employee)} (${ROLES[persona.role].label.toLowerCase()}).`);
    if (!routeAccess(pathname, persona.role).allowed) router.push("/app");
  };

  return (
    <Popover
      placement={placement}
      align={align}
      className={block ? "w-full" : undefined}
      panelClassName="w-[22em]"
      trigger={(p) => (
        <Button variant="secondary" size="sm" icon={Eye} iconEnd={compact ? undefined : ChevronsUpDown} aria-label={`Voir en tant que : ${employee ? fullName(employee) : ROLES[role].label}`} className={cn(block && "w-full justify-between")} {...p}>
          {!compact && (
            <span className="flex min-w-0 items-baseline gap-[0.45em]">
              <span className="hidden text-fg-muted xl:inline">Voir en tant que</span>
              <span className="max-w-[9em] truncate">{employee ? employee.firstName : ROLES[role].short}</span>
              <span className="hidden text-xs font-normal text-fg-muted lg:inline">{ROLES[role].short}</span>
            </span>
          )}
        </Button>
      )}
    >
      {(close) => (
        <div className="p-[0.35em]">
          <MenuLabel>Voir en tant que</MenuLabel>
          {personas.map((p) => (
            <MenuItem key={p.role} selected={p.role === role} onClick={() => choose(p, close)}>
              <Avatar employee={p.employee} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875em] font-medium">{fullName(p.employee)}</span>
                <span className="block truncate text-xs text-fg-muted">{ROLES[p.role].label}</span>
              </span>
              {p.role === role && <Check className="size-[1.1em] shrink-0" aria-hidden />}
            </MenuItem>
          ))}
          <p className="px-[0.9em] pb-[0.5em] pt-[0.4em] text-xs text-fg-muted">Mode démo : l&apos;interface s&apos;adapte aux droits du rôle choisi.</p>
        </div>
      )}
    </Popover>
  );
}
