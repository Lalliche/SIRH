"use client";

import { PageSkeleton } from "@/components/app/_kit/Skeleton";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, SearchInput, SelectInput } from "@/components/ui";
import { LEAVE_TYPES } from "@/data/constants";
import { CURRENT_PERIOD, TODAY } from "@/lib/clock";
import { daysInMonth, holidayOn, isWeekend } from "@/lib/dates";
import { useCollection } from "@/lib/db";
import { WEEKDAYS_SHORT, date, fullName, periodLabel } from "@/lib/format";
import { weekday } from "@/lib/dates";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import LeaveNav from "./LeaveNav";
import { LeaveSwatch } from "./LeaveTypeTag";
import { CONFLICT_RATE, fmtDays, shiftPeriod } from "./leave-utils";
import { useDirectory } from "./use-directory";

const NAME_COL = "11.5em";
const HATCH = "repeating-linear-gradient(135deg, transparent 0 0.28em, var(--border) 0.28em 0.36em)";

/** Month lanes: one row per employee, bars per leave, hatched Fri/Sat, holidays, today marker, coverage strip per department. */
export default function LeaveCalendar() {
  const me = useCurrentUser();
  const dir = useDirectory();
  const requests = useCollection("leaveRequests");
  const [period, setPeriod] = useState(CURRENT_PERIOD);
  const [dept, setDept] = useState("");
  const [q, setQ] = useState("");

  const n = daysInMonth(period);
  const days = useMemo(() => Array.from({ length: n }, (_, i) => `${period}-${String(i + 1).padStart(2, "0")}`), [period, n]);
  const first = days[0];
  const last = days[n - 1];
  const idx = (iso) => days.indexOf(iso);

  // Scope: employee = own department, manager = team + self, admin/hr/accountant = everyone.
  const people = useMemo(() => {
    const active = dir.employees.filter((e) => e.status !== "sorti");
    const ownDept = dir.byId[me.employeeId]?.departmentId;
    const base = me.role === "employee" ? active.filter((e) => e.departmentId === ownDept)
      : me.role === "manager" ? active.filter((e) => e.managerId === me.employeeId || e.id === me.employeeId)
      : active;
    const term = q.trim().toLowerCase();
    return base.filter((e) => (!dept || e.departmentId === dept) && (!term || fullName(e).toLowerCase().includes(term)));
  }, [dir, me, dept, q]);

  const groups = useMemo(() => {
    const month = requests.filter((r) => ["approved", "taken", "pending"].includes(r.status) && r.from <= last && r.to >= first);
    return dir.departments
      .map((d) => {
        const members = people.filter((e) => e.departmentId === d.id);
        // headcount for the rate = every active employee of the department, not only the filtered ones
        const headcount = dir.employees.filter((e) => e.departmentId === d.id && e.status !== "sorti").length;
        const rows = members.map((e) => ({ e, leaves: month.filter((r) => r.employeeId === e.id) }));
        const perDay = days.map((day) => {
          const out = new Set(month.filter((r) => r.from <= day && day <= r.to && dir.byId[r.employeeId]?.departmentId === d.id).map((r) => r.employeeId)).size;
          return { day, out, rate: headcount ? out / headcount : 0 };
        });
        const conflicts = perDay.filter((p) => !isWeekend(p.day) && !holidayOn(p.day) && p.rate > CONFLICT_RATE);
        return { d, rows, headcount, perDay, conflicts };
      })
      .filter((g) => g.rows.length);
  }, [dir, people, requests, days, first, last]);

  const conflictList = groups.filter((g) => g.conflicts.length);
  const todayIdx = idx(TODAY);
  const holidays = days.filter((d) => holidayOn(d));
  const minWidth = `calc(${NAME_COL} + ${n} * 1.9em)`;
  const cols = `repeat(${n}, minmax(0, 1fr))`;

  if (!me.ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader title="Calendrier des congés" description="Qui est absent, quand, et où la couverture d'un service passe sous le seuil." />
      <LeaveNav />

      <div className="mb-[1em] flex flex-wrap items-center gap-[0.6em]">
        <Button variant="secondary" size="icon" aria-label="Mois précédent" onClick={() => setPeriod(shiftPeriod(period, -1))}><ChevronLeft className="size-[1.2em]" /></Button>
        <h2 className="min-w-[9em] text-center font-display text-h3 font-semibold capitalize text-fg" aria-live="polite">{periodLabel(period)}</h2>
        <Button variant="secondary" size="icon" aria-label="Mois suivant" onClick={() => setPeriod(shiftPeriod(period, 1))}><ChevronRight className="size-[1.2em]" /></Button>
        {period !== CURRENT_PERIOD && <Button variant="ghost" size="sm" onClick={() => setPeriod(CURRENT_PERIOD)}>Aujourd’hui</Button>}
        <span className="flex-1" />
        <SearchInput className="w-[15em]" placeholder="Rechercher un salarié…" value={q} onChange={setQ} />
        {me.role !== "employee" && me.role !== "manager" && (
          <SelectInput aria-label="Service" className="w-[14em]" value={dept} onChange={setDept} placeholder="Tous les services" options={dir.departments.map((d) => ({ value: d.id, label: d.name }))} />
        )}
      </div>

      {conflictList.length > 0 && (
        <div role="status" className="mb-[1em] flex items-start gap-[0.7em] rounded-lg bg-warning-bg px-[1em] py-[0.8em] text-sm text-warning-fg">
          <AlertTriangle className="mt-[0.15em] size-[1.2em] shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Conflit de couverture : plus de {Math.round(CONFLICT_RATE * 100)} % d’un service absent</p>
            <p>{conflictList.map((g) => `${g.d.name} (${g.conflicts.length} jour${g.conflicts.length > 1 ? "s" : ""}, dès le ${date(g.conflicts[0].day)})`).join(" · ")}</p>
          </div>
        </div>
      )}

      <ul className="mb-[0.9em] flex flex-wrap gap-x-[1.1em] gap-y-[0.4em] text-xs text-fg-secondary" aria-label="Légende">
        {Object.entries(LEAVE_TYPES).map(([k, t]) => (
          <li key={k} className="flex items-center gap-[0.4em]"><LeaveSwatch type={k} />{t.label}</li>
        ))}
        <li className="flex items-center gap-[0.4em]"><span aria-hidden className="h-[0.8em] w-[1.4em] rounded-xs border border-dashed border-fg-muted" />En attente</li>
        <li className="flex items-center gap-[0.4em]"><span aria-hidden className="size-[0.8em] rounded-xs border border-border" style={{ backgroundImage: HATCH }} />Week-end</li>
        <li className="flex items-center gap-[0.4em]"><span aria-hidden className="size-[0.8em] rounded-xs bg-warning" />Conflit de couverture</li>
      </ul>

      {groups.length === 0 ? (
        <Card padded={false}><EmptyState title="Aucun salarié à afficher" description="Aucun résultat pour ces filtres." action={<Button variant="secondary" onClick={() => { setQ(""); setDept(""); }}>Effacer les filtres</Button>} /></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <div className="relative" style={{ minWidth }}>
            {/* Background layer: hatched Fri/Sat, holiday tint, today line */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 grid" style={{ insetInlineStart: NAME_COL, gridTemplateColumns: cols }}>
              {days.map((d, i) => (
                <div
                  key={d}
                  className={cn("border-s border-border-subtle", holidayOn(d) && !isWeekend(d) && "bg-neutral-bg", i === todayIdx && "border-s-2 border-s-accent")}
                  style={isWeekend(d) ? { backgroundImage: HATCH, backgroundColor: "var(--bg-sunken)" } : undefined}
                />
              ))}
            </div>

            <div className="relative z-10 grid h-[3.2em] border-b border-border bg-bg-sunken/70" style={{ gridTemplateColumns: `${NAME_COL} 1fr` }}>
              <div className="sticky start-0 z-20 flex items-end bg-bg-sunken px-[1em] pb-[0.5em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Salarié</div>
              <div className="grid" style={{ gridTemplateColumns: cols }}>
                {days.map((d, i) => (
                  <div key={d} title={holidayOn(d)?.label} className="flex flex-col items-center justify-end pb-[0.35em] text-center text-[0.7em] leading-tight text-fg-muted">
                    <span>{WEEKDAYS_SHORT[weekday(d)][0]}</span>
                    <span className={cn("num font-semibold", i === todayIdx ? "rounded-full bg-accent px-[0.4em] text-white" : "text-fg", holidayOn(d) && "underline decoration-dotted")}>{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {groups.map((g) => (
              <section key={g.d.id} aria-label={g.d.name}>
                <div className="relative z-10 grid border-b border-border-subtle bg-surface-2/80" style={{ gridTemplateColumns: `${NAME_COL} 1fr` }}>
                  <div className="sticky start-0 z-20 flex items-center gap-[0.5em] bg-surface-2 px-[1em] py-[0.45em]">
                    <span className="truncate text-sm font-semibold text-fg">{g.d.name}</span>
                    <span className="text-xs text-fg-muted num">{g.headcount}</span>
                    {g.conflicts.length > 0 && <Badge tone="warning" icon={AlertTriangle}>{g.conflicts.length} j</Badge>}
                  </div>
                  <div className="grid items-center" style={{ gridTemplateColumns: cols }} aria-label={`Part du service ${g.d.name} absente, jour par jour`}>
                    {g.perDay.map((p) => (
                      <div
                        key={p.day}
                        title={p.out ? `${date(p.day)} : ${p.out} absent${p.out > 1 ? "s" : ""} sur ${g.headcount} (${Math.round(p.rate * 100)} %)` : undefined}
                        className={cn("mx-px flex h-[1.5em] items-center justify-center rounded-xs text-[0.62em] font-semibold num", p.rate > CONFLICT_RATE && !isWeekend(p.day) ? "bg-warning text-white" : p.out && !isWeekend(p.day) ? "bg-primary-soft text-link" : "")}
                      >
                        {p.out && !isWeekend(p.day) ? p.out : ""}
                      </div>
                    ))}
                  </div>
                </div>
                {g.rows.map(({ e, leaves }) => (
                  <div key={e.id} className="relative z-10 grid h-[2.4em] border-b border-border-subtle" style={{ gridTemplateColumns: `${NAME_COL} 1fr` }}>
                    <div className="sticky start-0 z-20 flex min-w-0 items-center bg-surface px-[1em]">
                      <span className="truncate text-sm text-fg">{fullName(e)}</span>
                    </div>
                    <div className="relative">
                      {leaves.map((r) => {
                        const s = Math.max(0, idx(r.from < first ? first : r.from));
                        const en = idx(r.to > last ? last : r.to);
                        const color = LEAVE_TYPES[r.type]?.color ?? "var(--chart-7)";
                        const pending = r.status === "pending";
                        const span = en - s + 1;
                        return (
                          <div
                            key={r.id}
                            title={`${fullName(e)} · ${LEAVE_TYPES[r.type]?.label} · ${date(r.from)} → ${date(r.to)} (${fmtDays(r.days)})${pending ? " · en attente" : ""}`}
                            className={cn("absolute inset-y-[0.4em] flex items-center overflow-hidden rounded-sm border px-[0.4em] text-[0.7em] font-medium text-fg", pending && "border-dashed")}
                            style={{
                              insetInlineStart: `${(s / n) * 100}%`,
                              width: `${(span / n) * 100}%`,
                              borderColor: color,
                              backgroundColor: `color-mix(in srgb, ${color} ${pending ? 14 : 38}%, var(--surface))`,
                            }}
                          >
                            {span >= 3 && <span className="truncate">{LEAVE_TYPES[r.type]?.label}{pending ? " ?" : ""}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}

      {holidays.length > 0 && (
        <p className="mt-[0.9em] text-sm text-fg-secondary">
          <span className="font-medium text-fg">Jours fériés ce mois :</span> {holidays.map((h) => `${date(h)} · ${holidayOn(h).label}${holidayOn(h).estimated ? " (estimé)" : ""}`).join(" ; ")}.
        </p>
      )}
    </>
  );
}
