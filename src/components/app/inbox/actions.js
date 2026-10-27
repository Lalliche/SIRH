// Every approve/reject in the product goes through here: db write + audit + notification + undo closure.
import { LEAVE_TYPES, REQUEST_KINDS } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { db, getState, newId } from "@/lib/db";
import { dateShort, fullName, money } from "@/lib/format";
import { punchStatus } from "@/components/app/attendance/attendance-utils";
import { shiftPeriod } from "@/components/app/leave/leave-utils";

const ALL_ROLES = ["admin", "hr", "manager", "accountant", "employee"];

function trace(actor, action, target, detail) {
  db.audit(actor.employeeId, action, target, detail);
}
// Notifications are addressed to one employee (`employeeId`) — the shell filters on it.
function ping(emp, title, body, href) {
  db.notify({ title, body, href, employeeId: emp.id, roles: ALL_ROLES });
  return getState().notifications[0].id;
}
const dropNotif = (id) => db.update("notifications", (l) => l.filter((n) => n.id !== id));
const restore = (key, original) => db.update(key, (l) => l.map((x) => (x.id === original.id ? original : x)));

function decideLeave(id, approve, actor, reason) {
  const s = getState();
  const r = s.leaveRequests.find((x) => x.id === id);
  const emp = r && s.employees.find((e) => e.id === r.employeeId);
  if (!r || !emp || r.status !== "pending") return null;
  const consumes = approve && r.type === "annual";
  db.patch("leaveRequests", id, { status: approve ? "approved" : "rejected", decidedBy: actor.employeeId, decidedAt: TODAY, rejectReason: approve ? undefined : reason });
  if (consumes) db.patch("employees", emp.id, (e) => ({ leaveBalance: { ...e.leaveBalance, annual: e.leaveBalance.annual - r.days, taken: e.leaveBalance.taken + r.days } }));
  const what = `${LEAVE_TYPES[r.type]?.label ?? "Congé"} du ${dateShort(r.from)} au ${dateShort(r.to)} (${r.days} j)`;
  trace(actor, approve ? "Congé approuvé" : "Congé refusé", fullName(emp), reason ? `${what} · ${reason}` : what);
  const nid = ping(emp, approve ? "Votre congé a été approuvé" : "Votre congé a été refusé", reason ? `${what}. Motif : ${reason}` : what, "/app/leave");
  return {
    label: approve ? `Congé de ${emp.firstName} approuvé` : `Congé de ${emp.firstName} refusé`,
    undo() {
      restore("leaveRequests", r);
      restore("employees", emp);
      dropNotif(nid);
      trace(actor, "Décision annulée", fullName(emp), what);
    },
  };
}

function decideRequest(id, approve, actor, reason) {
  const s = getState();
  const r = s.requests.find((x) => x.id === id);
  const emp = r && s.employees.find((e) => e.id === r.employeeId);
  if (!r || !emp || r.status !== "pending") return null;
  const patch = { status: approve ? "approved" : "rejected", decidedAt: TODAY, decidedBy: actor.employeeId, rejectReason: approve ? undefined : reason };
  let loan = null;
  if (approve && r.kind.startsWith("attestation")) {
    const n = s.requests.filter((x) => x.docRef).length + 1;
    patch.docRef = `${r.kind === "attestation_salaire" ? "ATS" : "ATT"}-2026-${String(n).padStart(4, "0")}`;
  }
  if (approve && r.kind === "avance" && r.amount > 0) {
    const months = r.months || 6;
    loan = {
      id: newId("ln"),
      employeeId: emp.id,
      type: "avance",
      total: r.amount,
      monthly: Math.ceil(r.amount / months / 100) * 100,
      remaining: r.amount,
      status: "active",
      startDate: `${shiftPeriod(TODAY.slice(0, 7), 1)}-01`,
      reason: r.note || "Avance sur salaire",
      requestId: r.id,
      approvedBy: actor.employeeId,
      disbursedAt: TODAY,
    };
    patch.loanId = loan.id;
  }
  db.patch("requests", id, patch);
  if (loan) db.insert("loans", loan);
  const what = REQUEST_KINDS[r.kind] ?? "Demande";
  trace(actor, approve ? "Demande approuvée" : "Demande refusée", fullName(emp), reason ? `${what} · ${reason}` : what + (loan ? ` · échéancier créé (${money(loan.monthly, { decimals: 0 })}/mois)` : ""));
  const nid = ping(emp, approve ? `${what} : demande acceptée` : `${what} : demande refusée`, reason ? `Motif : ${reason}` : approve ? "Le document ou l'action est disponible dans Demandes." : "", "/app/requests");
  return {
    label: `${what} de ${emp.firstName} ${approve ? "approuvée" : "refusée"}`,
    undo() {
      restore("requests", r);
      if (loan) db.remove("loans", loan.id);
      dropNotif(nid);
      trace(actor, "Décision annulée", fullName(emp), what);
    },
  };
}

function decideLoan(id, approve, actor, reason) {
  const s = getState();
  const l = s.loans.find((x) => x.id === id);
  const emp = l && s.employees.find((e) => e.id === l.employeeId);
  if (!l || !emp || l.status !== "pending") return null;
  db.patch("loans", id, approve ? { status: "active", approvedBy: actor.employeeId, disbursedAt: TODAY } : { status: "rejected", rejectReason: reason, approvedBy: actor.employeeId });
  const what = `${l.type === "avance" ? "Avance" : "Prêt social"} de ${money(l.total, { decimals: 0 })}`;
  trace(actor, approve ? "Prêt approuvé" : "Prêt refusé", fullName(emp), reason ? `${what} · ${reason}` : `${what} · ${money(l.monthly, { decimals: 0 })}/mois`);
  const nid = ping(emp, approve ? "Votre prêt a été accordé" : "Votre demande de prêt a été refusée", reason ? `Motif : ${reason}` : `${what}, remboursé à ${money(l.monthly, { decimals: 0 })} par mois sur la paie.`, "/app/requests");
  return {
    label: `${what} ${approve ? "accordé" : "refusé"} à ${emp.firstName}`,
    undo() {
      restore("loans", l);
      dropNotif(nid);
      trace(actor, "Décision annulée", fullName(emp), what);
    },
  };
}

function decideCorrection(id, approve, actor, reason) {
  const s = getState();
  const rec = s.attendance.find((x) => x.id === id);
  const c = rec?.correction;
  const emp = rec && s.employees.find((e) => e.id === rec.employeeId);
  if (!rec || !emp || c?.status !== "pending") return null;
  const decided = { ...c, status: approve ? "approved" : "rejected", decidedBy: actor.employeeId, decidedAt: TODAY, rejectReason: approve ? undefined : reason };
  db.patch("attendance", id, approve ? { in: c.in, out: c.out, status: punchStatus(c.in, rec.status === "absent" ? "present" : rec.status), correction: decided } : { correction: decided });
  const what = `Pointage du ${dateShort(rec.date)} : ${c.in ?? "—"} → ${c.out ?? "—"}`;
  trace(actor, approve ? "Correction de pointage approuvée" : "Correction de pointage refusée", fullName(emp), reason ? `${what} · ${reason}` : what);
  const nid = ping(emp, approve ? "Correction de pointage acceptée" : "Correction de pointage refusée", reason ? `Motif : ${reason}` : what, "/app/attendance/timesheets");
  return {
    label: `Correction de ${emp.firstName} ${approve ? "approuvée" : "refusée"}`,
    undo() {
      restore("attendance", rec);
      dropNotif(nid);
      trace(actor, "Décision annulée", fullName(emp), what);
    },
  };
}

const handlers = { leave: decideLeave, request: decideRequest, loan: decideLoan, correction: decideCorrection };

/** decide("leave", "lv-001", "approve", { employeeId }) → { label, undo } | null */
export function decide(kind, id, decision, actor, reason = "") {
  return handlers[kind]?.(id, decision === "approve", actor, reason) ?? null;
}

/** Batch version: one combined undo. */
export function decideMany(entries, decision, actor, reason = "") {
  const done = entries.map((e) => decide(e.kind, e.id, decision, actor, reason)).filter(Boolean);
  const word = decision === "approve" ? "approuvées" : "refusées";
  return {
    count: done.length,
    label: done.length === 1 ? done[0].label : `${done.length} demandes ${word}`,
    undo: () => done.slice().reverse().forEach((d) => d.undo()),
  };
}
