"use client";

import { PageSkeleton } from "@/components/app/_kit/Skeleton";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, ClockAlert, Eye, RotateCcw } from "lucide-react";
import { Badge, Button, Card, Drawer, EmptyState, PageHeader, SearchInput, SelectInput, StatusBadge, Tabs, toast } from "@/components/ui";
import { ATTENDANCE_STATUS } from "@/data/constants";
import { approvableEmployees, visibleEmployees } from "@/components/app/leave/scope";
import { shiftPeriod } from "@/components/app/leave/leave-utils";
import { useDirectory } from "@/components/app/leave/use-directory";
import { CURRENT_PERIOD, TODAY } from "@/lib/clock";
import { daysInMonth, holidayOn, isWeekend, weekday } from "@/lib/dates";
import { db, useCollection, useDb } from "@/lib/db";
import { WEEKDAYS, WEEKDAYS_SHORT, date, fullName, periodLabel } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import AttendanceNav from "./AttendanceNav";
import CorrectionModal from "./CorrectionModal";
import OvertimePanel from "./OvertimePanel";
import { STATUS_OVERRIDE, SHIFT, fmtDec, fmtHours, hoursWorked } from "./attendance-utils";

const NAME_COL = "13em";
const END_COL = "11em";
const HATCH = "repeating-linear-gradient(135deg, transparent 0 0.28em, var(--border) 0.28em 0.36em)";
const statusMap = { ...ATTENDANCE_STATUS, ...STATUS_OVERRIDE };
const CELL = {
  present: "bg-success-bg text-success-fg",
  late: "bg-warning-bg text-warning-fg",
  absent: "bg-danger-bg text-danger-fg",
  remote: "bg-info-bg text-info-fg",
  mission: "bg-info-bg text-info-fg",
  leave: "bg-primary-soft text-link",
};
const LETTER = { absent: "A", leave: "C", mission: "M" };

export default function Timesheets() {
  const me = useCurrentUser();
  const dir = useDirectory();
  const attendance = useCollection("attendance");
  const approvals = useDb((s) => s.settings.timesheetApprovals) ?? NONE;

  const [period, setPeriod] = useState(CURRENT_PERIOD);
  const [tab, setTab] = useState("grid");
  const [dept, setDept] = useState("");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const [correction, setCorrection] = useState(null);

  const n = daysInMonth(period);
  const days = useMemo(() => Array.from({ length: n }, (_, i) => `${period}-${String(i + 1).padStart(2, "0")}`), [period, n]);
  const people = useMemo(() => {
    const term = q.trim().toLowerCase();
    return visibleEmployees(me.role, me.employeeId, dir.employees)
      .filter((e) => e.status !== "sorti" && (!dept || e.departmentId === dept) && (!term || fullName(e).toLowerCase().includes(term)));
  }, [me.role, me.employeeId, dir.employees, dept, q]);
  const approvable = useMemo(() => new Set(approvableEmployees(me.role, me.employeeId, dir.employees).map((e) => e.id)), [me.role, me.employeeId, dir.employees]);
  const isApprover = approvable.size > 0;

  const rows = useMemo(() => {
    const inMonth = attendance.filter((a) => a.date.startsWith(period));
    return people.map((e) => {
      const recs = new Map(inMonth.filter((a) => a.employeeId === e.id).map((a) => [a.date, a]));
      let total = 0, late = 0, short = 0, shortDays = 0, missing = 0;
      recs.forEach((a) => {
        const h = hoursWorked(a.in, a.out);
        if (h != null) { total += h; if (h < SHIFT.dayHours - 0.5) { short += SHIFT.dayHours - h; shortDays += 1; } }
        if (a.status === "late") late += 1;
        if (a.in && !a.out && a.date < TODAY) missing += 1;
      });
      const flags = [];
      if (late >= 3) flags.push({ key: "late", text: `Retards répétés (${late})` });
      if (shortDays >= 3) flags.push({ key: "short", text: `Heures manquantes (−${fmtDec(short)} h)` });
      if (missing > 0) flags.push({ key: "punch", text: `Pointage manquant (${missing})` });
      const key = `${period}:${e.id}`;
      return { e, recs, total, late, flags, approval: approvals[key] ?? null, key };
    });
  }, [people, attendance, period, approvals]);

  const setApprovals = (next) => db.patchSettings({ timesheetApprovals: next });
  const approve = (list) => {
    const todo = list.filter((r) => !r.approval && approvable.has(r.e.id));
    if (!todo.length) return;
    const prev = approvals;
    setApprovals({ ...approvals, ...Object.fromEntries(todo.map((r) => [r.key, { by: me.employeeId, at: TODAY }])) });
    db.audit(me.employeeId, "Feuilles de temps approuvées", periodLabel(period), `${todo.length} salarié(s)`);
    toast.success(todo.length === 1 ? `Feuille de ${todo[0].e.firstName} approuvée` : `${todo.length} feuilles approuvées`, { action: { label: "Annuler", onClick: () => setApprovals(prev) } });
  };
  const reopen = (r) => {
    const { [r.key]: _gone, ...rest } = approvals;
    setApprovals(rest);
    db.audit(me.employeeId, "Feuille de temps rouverte", fullName(r.e), periodLabel(period));
    toast.info("Feuille rouverte");
  };

  const clean = rows.filter((r) => !r.approval && approvable.has(r.e.id) && r.flags.length === 0);
  const detailRow = detail && rows.find((r) => r.e.id === detail);
  const holidays = days.filter((d) => holidayOn(d) && !isWeekend(d));
  const minWidth = `calc(${NAME_COL} + ${END_COL} + ${n} * 1.9em)`;
  const cols = `repeat(${n}, minmax(0, 1fr))`;

  const detailDays = detailRow ? days.filter((d) => d <= TODAY && !isWeekend(d) && !holidayOn(d)).reverse() : [];
  const correctionMode = (empId) => (isApprover && approvable.has(empId) ? "direct" : "request");

  if (!me.ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader title="Feuilles de temps" description="Heures du mois par salarié, anomalies à traiter et approbation avant la paie." />
      <AttendanceNav />
      <Tabs
        className="mb-[1.25em]"
        value={tab}
        onChange={setTab}
        tabs={[{ value: "grid", label: "Pointages du mois" }, { value: "overtime", label: "Heures supplémentaires" }]}
      />

      <div className="mb-[1em] flex flex-wrap items-center gap-[0.6em]">
        <Button variant="secondary" size="icon" aria-label="Mois précédent" onClick={() => setPeriod(shiftPeriod(period, -1))}><ChevronLeft className="size-[1.2em]" /></Button>
        <h2 className="min-w-[9em] text-center font-display text-h3 font-semibold capitalize text-fg" aria-live="polite">{periodLabel(period)}</h2>
        <Button variant="secondary" size="icon" aria-label="Mois suivant" disabled={period >= CURRENT_PERIOD} onClick={() => setPeriod(shiftPeriod(period, 1))}><ChevronRight className="size-[1.2em]" /></Button>
        <span className="flex-1" />
        {people.length > 1 && <SearchInput className="w-[14em]" placeholder="Rechercher…" value={q} onChange={setQ} />}
        {["admin", "hr", "accountant"].includes(me.role) && <SelectInput aria-label="Service" className="w-[14em]" value={dept} onChange={setDept} placeholder="Tous les services" options={dir.departments.map((d) => ({ value: d.id, label: d.name }))} />}
        {tab === "grid" && isApprover && <Button icon={Check} disabled={!clean.length} onClick={() => approve(clean)}>Approuver les feuilles sans anomalie{clean.length ? ` (${clean.length})` : ""}</Button>}
      </div>

      {tab === "overtime" ? (
        <OvertimePanel period={period} employees={people} />
      ) : people.length === 0 ? (
        <Card padded={false}><EmptyState icon={ClockAlert} title="Aucun salarié à afficher" description="Aucun résultat pour ces filtres." action={<Button variant="secondary" onClick={() => { setQ(""); setDept(""); }}>Effacer les filtres</Button>} /></Card>
      ) : (
        <>
          <ul className="mb-[0.9em] flex flex-wrap gap-x-[1.1em] gap-y-[0.4em] text-xs text-fg-secondary" aria-label="Légende">
            {[["present", "8,5", "Heures travaillées"], ["late", "8,0", "Retard"], ["remote", "8,0", "Télétravail"], ["absent", "A", "Absent"], ["leave", "C", "Congé"]].map(([k, c, l]) => (
              <li key={k} className="flex items-center gap-[0.4em]"><span className={cn("inline-flex h-[1.4em] min-w-[1.6em] items-center justify-center rounded-xs text-[0.85em] font-semibold", CELL[k])}>{c}</span>{l}</li>
            ))}
            <li className="flex items-center gap-[0.4em]"><span aria-hidden className="size-[0.9em] rounded-xs border border-border" style={{ backgroundImage: HATCH }} />Week-end</li>
          </ul>

          <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
            <div style={{ minWidth }}>
              <div className="grid h-[3em] border-b border-border bg-bg-sunken" style={{ gridTemplateColumns: `${NAME_COL} 1fr ${END_COL}` }}>
                <div className="sticky start-0 z-20 flex items-end bg-bg-sunken px-[1em] pb-[0.5em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Salarié</div>
                <div className="grid" style={{ gridTemplateColumns: cols }}>
                  {days.map((d) => (
                    <div key={d} title={holidayOn(d)?.label} className={cn("flex flex-col items-center justify-end pb-[0.35em] text-[0.7em] leading-tight text-fg-muted", isWeekend(d) && "opacity-60")}>
                      <span>{WEEKDAYS_SHORT[weekday(d)][0]}</span>
                      <span className={cn("num font-semibold text-fg", d === TODAY && "rounded-full bg-accent px-[0.4em] text-white")}>{Number(d.slice(8))}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-end justify-end px-[1em] pb-[0.5em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Approbation</div>
              </div>

              {rows.map((r) => (
                <div key={r.e.id} className="grid min-h-[3.2em] border-b border-border-subtle last:border-b-0 hover:bg-surface-hover" style={{ gridTemplateColumns: `${NAME_COL} 1fr ${END_COL}` }}>
                  <div className="sticky start-0 z-10 flex min-w-0 flex-col justify-center gap-[0.2em] bg-surface px-[1em] py-[0.4em]">
                    <span className="truncate text-sm font-medium text-fg">{fullName(r.e)}</span>
                    <span className="num text-xs text-fg-muted">{fmtDec(r.total)} h · {r.late} retard{r.late > 1 ? "s" : ""}</span>
                    {r.flags.map((f) => <Badge key={f.key} tone="warning" icon={AlertTriangle} className="self-start">{f.text}</Badge>)}
                  </div>
                  <div className="grid items-center" style={{ gridTemplateColumns: cols }}>
                    {days.map((d) => {
                      const a = r.recs.get(d);
                      const off = isWeekend(d) || holidayOn(d);
                      const h = a ? hoursWorked(a.in, a.out) : null;
                      const txt = a ? (LETTER[a.status] ?? (h != null ? fmtDec(h) : a.in ? "?" : "")) : "";
                      return (
                        <div
                          key={d}
                          title={a ? `${date(d)} · ${statusMap[a.status]?.label} · ${a.in ?? "—"} → ${a.out ?? "—"}` : off ? holidayOn(d)?.label ?? "Week-end" : undefined}
                          className={cn("mx-px flex h-[1.9em] items-center justify-center self-center rounded-xs text-[0.7em] font-semibold num", a ? CELL[a.status] : "")}
                          style={off && !a ? { backgroundImage: HATCH, backgroundColor: "var(--bg-sunken)" } : undefined}
                        >
                          {txt}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-end gap-[0.3em] px-[0.8em]">
                    {r.approval ? (
                      <>
                        <Badge tone="success" icon={Check}>Approuvé</Badge>
                        {approvable.has(r.e.id) && <Button size="icon" variant="ghost" aria-label={`Rouvrir la feuille de ${fullName(r.e)}`} onClick={() => reopen(r)}><RotateCcw className="size-[1.1em]" /></Button>}
                      </>
                    ) : approvable.has(r.e.id) ? (
                      <Button size="sm" variant="soft" onClick={() => approve([r])}>Approuver</Button>
                    ) : (
                      <Badge tone="neutral">À approuver</Badge>
                    )}
                    <Button size="icon" variant="ghost" aria-label={`Voir le détail de ${fullName(r.e)}`} onClick={() => setDetail(r.e.id)}><Eye className="size-[1.1em]" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {holidays.length > 0 && <p className="mt-[0.8em] text-sm text-fg-secondary"><span className="font-medium text-fg">Jours fériés :</span> {holidays.map((h) => `${date(h)} · ${holidayOn(h).label}`).join(" ; ")}.</p>}
        </>
      )}

      <Drawer
        open={!!detailRow}
        onClose={() => setDetail(null)}
        title={detailRow ? fullName(detailRow.e) : ""}
        description={detailRow ? `${periodLabel(period)} · ${fmtDec(detailRow.total)} h travaillées` : ""}
      >
        {detailRow && (
          <div className="flex flex-col gap-[1em]">
            {detailRow.flags.length > 0 && (
              <div className="flex flex-wrap gap-[0.4em]">{detailRow.flags.map((f) => <Badge key={f.key} tone="warning" icon={AlertTriangle}>{f.text}</Badge>)}</div>
            )}
            <ul className="flex flex-col divide-y divide-border-subtle">
              {detailDays.map((d) => {
                const a = detailRow.recs.get(d);
                const h = a ? hoursWorked(a.in, a.out) : null;
                const status = a?.status ?? (d < TODAY ? "absent" : "pending");
                return (
                  <li key={d} className="flex flex-wrap items-center gap-[0.6em] py-[0.55em] text-sm">
                    <span className="w-[6.5em] capitalize text-fg">{WEEKDAYS[weekday(d)].slice(0, 3)}. {d.slice(8)}/{d.slice(5, 7)}</span>
                    <span className="num min-w-[8em] flex-1 text-fg-secondary">{a?.in ?? "—"} → {a?.out ?? "—"}{h != null && <span className="ms-[0.5em] text-fg-muted">{fmtHours(h)}</span>}</span>
                    <StatusBadge status={status} map={statusMap} />
                    {a?.correction?.status === "pending" && <Badge tone="info" dot={false}>Correction en attente</Badge>}
                    {status !== "leave" && (me.employeeId === detailRow.e.id || approvable.has(detailRow.e.id)) && !detailRow.approval && (
                      <Button size="sm" variant="ghost" onClick={() => setCorrection({ employee: detailRow.e, date: d, record: a ?? null })}>{correctionMode(detailRow.e.id) === "direct" ? "Corriger" : "Demander une correction"}</Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Drawer>

      <CorrectionModal key={correction ? `${correction.employee.id}:${correction.date}` : "none"} target={correction} mode={correction ? correctionMode(correction.employee.id) : "request"} onClose={() => setCorrection(null)} />
    </>
  );
}

const NONE = {};
