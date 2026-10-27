// Attendance writes (db + audit + undo). Called from event handlers only.
import { TODAY } from "@/lib/clock";
import { db, getState } from "@/lib/db";
import { dateShort, fullName } from "@/lib/format";
import { SHIFT, nowHHMM, punchStatus } from "./attendance-utils";

const recId = (employeeId, date) => `${date}:${employeeId}`;
const nameOf = (id) => fullName(getState().employees.find((e) => e.id === id));
const restoreRec = (prev, id) => db.update("attendance", (l) => (prev ? l.map((x) => (x.id === id ? prev : x)) : l.filter((x) => x.id !== id)));

function upsert(employeeId, date, fields) {
  const id = recId(employeeId, date);
  const prev = getState().attendance.find((a) => a.id === id) ?? null;
  if (prev) db.patch("attendance", id, fields);
  else db.insert("attendance", { id, employeeId, date, in: null, out: null, status: "absent", ...fields });
  return { id, prev };
}

/** Direct edit of a day's punches (admin/hr/manager). Returns undo(). */
export function saveTimes({ employeeId, date, inT, outT }, actor) {
  const prevStatus = getState().attendance.find((a) => a.id === recId(employeeId, date))?.status;
  const keep = prevStatus === "remote" || prevStatus === "mission" ? prevStatus : "present";
  const { id, prev } = upsert(employeeId, date, { in: inT || null, out: outT || null, status: inT ? punchStatus(inT, keep) : "absent", edited: true });
  db.audit(actor.employeeId, "Pointage modifié", nameOf(employeeId), `${dateShort(date)} · ${inT || "—"} → ${outT || "—"}`);
  return () => restoreRec(prev, id);
}

export function markAllPresent(rows, date, actor) {
  const targets = rows.filter((r) => r.status === "absent" || r.status === "pending");
  if (!targets.length) return null;
  const ids = new Set(targets.map((r) => r.employee.id));
  const prevRecs = getState().attendance.filter((a) => a.date === date && ids.has(a.employeeId));
  const out = date < TODAY ? SHIFT.end : null;
  db.update("attendance", (l) => [
    ...l.filter((a) => !(a.date === date && ids.has(a.employeeId))),
    ...targets.map((r) => ({ id: recId(r.employee.id, date), employeeId: r.employee.id, date, in: SHIFT.start, out, status: "present", edited: true })),
  ]);
  db.audit(actor.employeeId, "Tous marqués présents", `Pointage du ${dateShort(date)}`, `${targets.length} salarié(s)`);
  return {
    count: targets.length,
    undo: () => db.update("attendance", (l) => [...l.filter((a) => !(a.date === date && ids.has(a.employeeId))), ...prevRecs]),
  };
}

export function clockIn(employeeId, { remote = false } = {}) {
  const t = nowHHMM();
  const { id, prev } = upsert(employeeId, TODAY, { in: t, out: null, status: remote ? "remote" : punchStatus(t, "present") });
  db.audit(employeeId, remote ? "Arrivée pointée (télétravail)" : "Arrivée pointée", nameOf(employeeId), `${dateShort(TODAY)} à ${t}`);
  return () => restoreRec(prev, id);
}

export function clockOut(employeeId) {
  const t = nowHHMM();
  const { id, prev } = upsert(employeeId, TODAY, { out: t });
  db.audit(employeeId, "Départ pointé", nameOf(employeeId), `${dateShort(TODAY)} à ${t}`);
  return () => restoreRec(prev, id);
}

/** Employee asks for a correction; lands in the manager's inbox. */
export function requestCorrection({ employeeId, date, inT, outT, reason }, actor) {
  upsert(employeeId, date, { correction: { in: inT || null, out: outT || null, reason, status: "pending", requestedAt: TODAY, requestedBy: actor.employeeId } });
  db.audit(actor.employeeId, "Correction de pointage demandée", nameOf(employeeId), `${dateShort(date)} · ${inT || "—"} → ${outT || "—"}`);
  db.notify({ title: "Correction de pointage à valider", body: `${nameOf(employeeId)} · ${dateShort(date)}`, href: "/app/inbox", roles: ["admin", "hr", "manager"] });
}

/** Imported terminal punches: [{employeeId, date, in, out}] → attendance rows. */
export function applyPunches(punches, actor, source) {
  const ids = new Map(punches.map((p) => [recId(p.employeeId, p.date), p]));
  const prev = getState().attendance.filter((a) => ids.has(a.id));
  db.update("attendance", (l) => [
    ...l.filter((a) => !ids.has(a.id)),
    ...punches.map((p) => {
      const old = prev.find((a) => a.id === recId(p.employeeId, p.date));
      return { id: recId(p.employeeId, p.date), employeeId: p.employeeId, date: p.date, in: p.in, out: p.out, status: punchStatus(p.in, old?.status === "remote" || old?.status === "mission" ? old.status : "present"), source };
    }),
  ]);
  db.audit(actor.employeeId, "Pointages importés", source, `${punches.length} journée(s)`);
  return () => db.update("attendance", (l) => [...l.filter((a) => !ids.has(a.id)), ...prev]);
}
