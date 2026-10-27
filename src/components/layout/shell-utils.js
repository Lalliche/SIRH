"use client";

import { useMemo } from "react";
import { Bell, Inbox, ReceiptText, ShieldCheck, Users, Wallet } from "lucide-react";
import { navGroups } from "@/content/nav";
import { TODAY } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { dateShort } from "@/lib/format";
import { useCollection } from "@/lib/db";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePendingCount } from "@/components/app/inbox/use-pending";

const flatNav = navGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

/** Nav groups filtered by role (empty groups dropped). */
export function visibleNav(role) {
  return navGroups.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length);
}

/** Longest matching nav href for a pathname (used for the active state and the access guard). */
export function matchNavItem(pathname, items = flatNav) {
  let best = null;
  for (const i of items) {
    const hit = i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`);
    if (hit && (!best || i.href.length > best.href.length)) best = i;
  }
  return best;
}

export function routeAccess(pathname, role) {
  const item = matchNavItem(pathname);
  return { item, allowed: !item || item.roles.includes(role) };
}

export function relativeDay(iso) {
  if (iso === TODAY) return "Aujourd'hui";
  if (iso === addDays(TODAY, -1)) return "Hier";
  return dateShort(iso);
}

/** Notifications visible to the current role, newest first. */
export function useRoleNotifications() {
  const all = useCollection("notifications");
  const { role, employeeId } = useCurrentUser();
  return useMemo(() => {
    const items = all.filter((n) => (n.roles ?? []).includes(role) && (!n.employeeId || n.employeeId === employeeId)).sort((a, b) => b.date.localeCompare(a.date));
    return { items, unread: items.filter((n) => !n.read).length };
  }, [all, role, employeeId]);
}

/** Live counter for the sidebar badges — same source as the inbox itself. */
export function useNavCounts() {
  return { inbox: usePendingCount() };
}

const NOTIF_ICONS = [
  ["/app/inbox", Inbox],
  ["/app/payroll", Wallet],
  ["/app/payslips", ReceiptText],
  ["/app/employees", Users],
  ["/app/compliance", ShieldCheck],
];
export const notificationIcon = (href = "") => NOTIF_ICONS.find(([p]) => href.startsWith(p))?.[1] ?? Bell;
