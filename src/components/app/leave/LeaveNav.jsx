"use client";

import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ClipboardList, Settings2, Wallet } from "lucide-react";
import { Tabs } from "@/components/ui";
import { useCurrentUser } from "@/lib/use-current-user";

const TABS = [
  { value: "/app/leave", label: "Mon solde", icon: Wallet, roles: null },
  { value: "/app/leave/requests", label: "Demandes", icon: ClipboardList, roles: ["admin", "hr", "manager", "accountant"] },
  { value: "/app/leave/calendar", label: "Calendrier", icon: CalendarDays, roles: null },
  { value: "/app/leave/policies", label: "Politiques", icon: Settings2, roles: ["admin", "hr", "accountant"] },
];

export default function LeaveNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useCurrentUser();
  const tabs = TABS.filter((t) => !t.roles || t.roles.includes(role)).map(({ roles, ...t }) => t);
  const current = tabs.find((t) => t.value === pathname.replace(/\/$/, ""))?.value ?? "/app/leave";
  return <Tabs tabs={tabs} value={current} onChange={(v) => router.push(v)} className="mb-[1.5em]" />;
}
