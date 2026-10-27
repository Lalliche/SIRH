"use client";

import { useEffect, useMemo } from "react";
import { db, getState, newId, useCollection } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { useCurrentUser } from "@/lib/use-current-user";
import { listPending } from "./inbox-items";

// A coverage conflict (5 production colleagues approved off 10-14 Nov) and an advance asked while one is running.
function seedDemoConflicts(s) {
  const mates = s.employees.filter((e) => e.managerId === "emp-004" && e.id !== "emp-012" && e.status !== "sorti" && e.departmentId === "dep-prod").slice(0, 5);
  mates.forEach((e) => {
    if (s.leaveRequests.some((l) => l.employeeId === e.id && l.from <= "2026-11-14" && l.to >= "2026-11-10" && l.status !== "rejected")) return;
    db.insert("leaveRequests", { id: newId("lv"), employeeId: e.id, type: "annual", from: "2026-11-10", to: "2026-11-14", days: 5, status: "approved", reason: "", createdAt: "2026-10-05", decidedBy: "emp-004", decidedAt: "2026-10-07" });
  });
  if (!s.requests.some((r) => r.id === "rq-demo-avance")) {
    db.insert("requests", { id: "rq-demo-avance", employeeId: "emp-014", kind: "avance", status: "pending", note: "Frais de rentrée scolaire", amount: 30000, months: 3, createdAt: "2026-10-26" }, { prepend: true });
  }
}

/**
 * Demo data top-up: the seed has no timesheet corrections, so create a few once per db
 * (flag in settings) so the unified inbox shows all four item types. Idempotent.
 */
export function seedDemoCorrections() {
  const s = getState();
  if (s.settings?.demoInbox) return;
  const past = s.attendance.filter((a) => a.date < TODAY && (a.status === "absent" || a.status === "late") && !a.correction).sort((a, b) => b.date.localeCompare(a.date));
  const managerOf = (a) => s.employees.find((e) => e.id === a.employeeId)?.managerId;
  const pick = (mgr, status) => past.find((a) => managerOf(a) === mgr && a.status === status);
  const picks = [
    [pick("emp-004", "absent"), { in: "08:05", out: "17:10", reason: "Terminal de l'entrée A hors ligne ce jour-là, présent au poste." }],
    [pick("emp-004", "late"), { in: "07:55", reason: "Badge validé en retard après le contrôle de sécurité." }],
    [pick("emp-006", "absent") ?? pick("emp-008", "absent"), { in: "08:00", out: "17:00", reason: "Oubli de badge, présence confirmée par le responsable." }],
  ];
  picks.forEach(([rec, c], i) => {
    if (!rec) return;
    db.patch("attendance", rec.id, { correction: { in: c.in, out: c.out ?? rec.out, reason: c.reason, status: "pending", requestedAt: TODAY === rec.date ? TODAY : `2026-10-2${5 + (i % 2)}`, requestedBy: rec.employeeId } });
  });
  seedDemoConflicts(s);
  db.patchSettings({ demoInbox: true });
}

/** Pending approvals for the current user (leave + requests + loans + corrections), role-scoped. */
export function usePendingCount() {
  const user = useCurrentUser();
  const employees = useCollection("employees");
  const leaveRequests = useCollection("leaveRequests");
  const requests = useCollection("requests");
  const loans = useCollection("loans");
  const attendance = useCollection("attendance");
  useEffect(() => { seedDemoCorrections(); }, []);
  return useMemo(
    () => listPending({ employees, leaveRequests, requests, loans, attendance }, user).length,
    [employees, leaveRequests, requests, loans, attendance, user],
  );
}
