"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftRight, DatabaseBackup, LogOut, UserRound } from "lucide-react";
import { Avatar, Button, toast } from "@/components/ui";
import { db } from "@/lib/db";
import { ROLES } from "@/data/constants";
import { clearSession } from "@/lib/session";
import { fullName } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { Popover, MenuItem } from "./Popover";

export function UserMenu() {
  const router = useRouter();
  const { role, employee } = useCurrentUser();

  return (
    <Popover
      panelClassName="w-[20em]"
      trigger={(p) => (
        <Button variant="ghost" className="!h-auto !gap-0 !rounded-full !p-[0.15em] max-md:p-[0.1em]" aria-label={`Menu du compte, ${employee ? fullName(employee) : ROLES[role].label}`} {...p}>
          <Avatar employee={employee ?? undefined} name={employee ? undefined : ROLES[role].label} size="md" />
        </Button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center gap-[0.75em] border-b border-border-subtle px-[1em] py-[0.9em]">
            <Avatar employee={employee ?? undefined} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">{employee ? fullName(employee) : "—"}</p>
              <p className="truncate text-xs text-fg-muted">{ROLES[role].label}</p>
              <p className="truncate text-xs text-fg-faint">{employee?.email}</p>
            </div>
          </div>
          <div className="p-[0.35em]">
            <MenuItem icon={UserRound} href="/app/me" onClick={() => close(false)}>Mon profil</MenuItem>
            <MenuItem icon={ArrowLeftRight} href="/demo" onClick={() => close(false)}>Changer de rôle</MenuItem>
            <MenuItem
              icon={DatabaseBackup}
              onClick={() => {
                close(false);
                db.reset();
                toast.success("Données de démonstration réinitialisées.");
              }}
            >
              Réinitialiser les données de démo
            </MenuItem>
          </div>
          <div className="border-t border-border-subtle p-[0.35em]">
            <MenuItem
              icon={LogOut}
              onClick={() => {
                close(false);
                clearSession();
                router.push("/demo");
              }}
            >
              Déconnexion
            </MenuItem>
          </div>
        </div>
      )}
    </Popover>
  );
}
