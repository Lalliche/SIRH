"use client";

import { PageSkeleton } from "@/components/app/_kit/Skeleton";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Pencil, TrendingDown, X } from "lucide-react";
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, KpiCard, PageHeader, PersonCell, SearchInput, Segmented, StatusBadge, TextInput, toast } from "@/components/ui";
import { ATTENDANCE_STATUS } from "@/data/constants";
import { visibleEmployees } from "@/components/app/leave/scope";
import { useDirectory } from "@/components/app/leave/use-directory";
import { TODAY } from "@/lib/clock";
import { addDays, holidayOn, isWeekend, weekday } from "@/lib/dates";
import { useCollection } from "@/lib/db";
import { WEEKDAYS, dateLong, fullName, int } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import { markAllPresent, saveTimes } from "./attendance-actions";
import { STATUS_OVERRIDE, buildDayRows, dayStats, fmtHours, recentAverage } from "./attendance-utils";
import AttendanceNav from "./AttendanceNav";
import ClockCard from "./ClockCard";
import TerminalsPanel from "./TerminalsPanel";

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "present", label: "Présents" },
  { value: "late", label: "Retards" },
  { value: "absent", label: "Absents" },
  { value: "remote", label: "Télétravail" },
];
const statusMap = { ...ATTENDANCE_STATUS, ...STATUS_OVERRIDE };

function MyRecent({ meId, attendance }) {
  const mine = attendance.filter((a) => a.employeeId === meId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  return (
    <Card>
      <CardHeader title="Mes derniers pointages" action={<Button size="sm" variant="secondary" href="/app/attendance/timesheets">Ma feuille de temps</Button>} />
      {mine.length === 0 ? <p className="text-sm text-fg-secondary">Aucun pointage enregistré.</p> : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {mine.map((a) => (
            <li key={a.id} className="flex items-center gap-[0.75em] py-[0.55em] text-sm first:pt-0 last:pb-0">
              <span className="w-[9em] capitalize text-fg">{WEEKDAYS[weekday(a.date)].slice(0, 3)}. {a.date.slice(8)}/{a.date.slice(5, 7)}</span>
              <span className="num flex-1 text-fg-secondary">{a.in ?? "—"} → {a.out ?? "—"}</span>
              <StatusBadge status={a.status} map={statusMap} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function AttendanceBoard() {
  const me = useCurrentUser();
  const dir = useDirectory();
  const attendance = useCollection("attendance");
  const leaveRequests = useCollection("leaveRequests");

  const [day, setDay] = useState(TODAY);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // employee id
  const [draft, setDraft] = useState({ in: "", out: "" });
  const [flash, setFlash] = useState(null);

  const isManager = ["admin", "hr", "manager"].includes(me.role);
  const scoped = useMemo(() => visibleEmployees(me.role, me.employeeId, dir.employees), [me.role, me.employeeId, dir.employees]);
  const rows = useMemo(() => buildDayRows({ employees: scoped, attendance, leaveRequests }, day), [scoped, attendance, leaveRequests, day]);
  const stats = useMemo(() => dayStats(rows), [rows]);
  const fallbackAvg = useMemo(() => (stats.avg == null ? recentAverage(attendance, new Set(scoped.map((e) => e.id))) : null), [stats.avg, attendance, scoped]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => filter === "all" || (filter === "absent" ? r.status === "absent" || r.status === "pending" : r.status === filter))
      .filter((r) => !term || fullName(r.employee).toLowerCase().includes(term) || r.employee.matricule.toLowerCase().includes(term))
      .map((r) => ({ ...r, id: r.employee.id }));
  }, [rows, filter, q]);

  const nonWorking = isWeekend(day) ? "Week-end (vendredi, samedi)" : holidayOn(day)?.label;
  const canMarkAll = isManager && !nonWorking && day <= TODAY && rows.some((r) => r.status === "absent" || r.status === "pending");

  const startEdit = (r) => { setEditing(r.employee.id); setDraft({ in: r.in ?? "", out: r.out ?? "" }); };
  const cancel = () => setEditing(null);
  const commit = (r) => {
    const undo = saveTimes({ employeeId: r.employee.id, date: day, inT: draft.in, outT: draft.out }, me);
    setEditing(null);
    setFlash(r.employee.id);
    setTimeout(() => setFlash(null), 600);
    toast.success(`Horaires de ${r.employee.firstName} enregistrés`, { action: { label: "Annuler", onClick: undo } });
  };
  const onKey = (r) => (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(r); }
    if (e.key === "Escape") { e.stopPropagation(); cancel(); }
  };

  const everyone = () => {
    const res = markAllPresent(rows, day, me);
    if (res) toast.success(`${res.count} salarié(s) marqué(s) présent(s)`, { action: { label: "Annuler", onClick: res.undo } });
  };

  const renderTime = (field, label, r) => {
    if (editing === r.employee.id) {
      return <TextInput type="time" aria-label={`${label} de ${fullName(r.employee)}`} className="w-[7.5em]" value={draft[field]} onChange={(v) => setDraft((d) => ({ ...d, [field]: v }))} onKeyDown={onKey(r)} autoFocus={field === "in"} />;
    }
    const v = r[field];
    return (
      <span className={cn("num rounded-sm px-[0.3em] py-[0.15em] transition-colors duration-300", flash === r.employee.id && "bg-primary-soft")} onDoubleClick={isManager ? () => startEdit(r) : undefined} title={isManager ? "Double-clic pour modifier" : undefined}>
        {v ?? <span className="text-fg-faint">—</span>}
      </span>
    );
  };

  const columns = [
    { key: "name", header: "Salarié", sortValue: (r) => fullName(r.employee), cell: (r) => <PersonCell employee={r.employee} sub={dir.department(r.employee)} /> },
    { key: "in", header: "Entrée", width: "9em", sortValue: (r) => r.in ?? "99", cell: (r) => renderTime("in", "Entrée", r) },
    { key: "out", header: "Sortie", width: "9em", sortValue: (r) => r.out ?? "99", cell: (r) => renderTime("out", "Sortie", r) },
    {
      key: "status", header: "Statut", sortValue: (r) => statusMap[r.status]?.label,
      cell: (r) => (
        <span className="inline-flex flex-wrap items-center gap-[0.4em]">
          <StatusBadge status={r.status} map={statusMap} />
          {r.correction && <Badge tone="info" dot={false}>Correction demandée</Badge>}
        </span>
      ),
    },
    {
      key: "hours", header: "Heures", align: "end", sortValue: (r) => r.hours ?? -1,
      cell: (r) => r.hours == null ? <span className="text-fg-faint">—</span> : (
        <span className="inline-flex items-center gap-[0.5em]">
          {fmtHours(r.hours)}
          {r.deficit > 0 && <span className="inline-flex items-center gap-[0.2em] text-xs text-danger-fg"><TrendingDown className="size-[1em]" aria-hidden />−{fmtHours(r.deficit)}</span>}
        </span>
      ),
    },
    ...(isManager ? [{
      key: "actions", header: "", sortable: false, align: "end",
      cell: (r) => editing === r.employee.id ? (
        <span className="inline-flex gap-[0.3em]">
          <Button size="icon" variant="soft" aria-label="Enregistrer les horaires" onClick={() => commit(r)}><Check className="size-[1.2em]" /></Button>
          <Button size="icon" variant="ghost" aria-label="Annuler la modification" onClick={cancel}><X className="size-[1.2em]" /></Button>
        </span>
      ) : r.status === "leave" ? null : (
        <Button size="icon" variant="ghost" aria-label={`Modifier les horaires de ${fullName(r.employee)}`} onClick={() => startEdit(r)}><Pencil className="size-[1.1em]" /></Button>
      ),
    }] : []),
  ];

  if (!me.ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title="Pointage"
        description={isManager ? "Présences du jour, retards et absences. Modifiez un horaire d'un double-clic." : "Pointez votre arrivée et votre départ, consultez vos derniers jours."}
        actions={isManager && <Button icon={ClipboardCheck} disabled={!canMarkAll} onClick={everyone}>Marquer tous présents</Button>}
      />
      <AttendanceNav />

      {!isManager ? (
        <div className="grid gap-[1.25em] lg:grid-cols-2">
          <ClockCard />
          <MyRecent meId={me.employeeId} attendance={attendance} />
        </div>
      ) : (
        <>
          <div className="mb-[1.25em] flex flex-wrap items-center gap-[0.6em]">
            <Button variant="secondary" size="icon" aria-label="Jour précédent" onClick={() => setDay(addDays(day, -1))}><ChevronLeft className="size-[1.2em]" /></Button>
            <TextInput aria-label="Choisir un jour" type="date" max={TODAY} value={day} onChange={(v) => v && setDay(v)} className="w-[11em]" />
            <Button variant="secondary" size="icon" aria-label="Jour suivant" disabled={day >= TODAY} onClick={() => setDay(addDays(day, 1))}><ChevronRight className="size-[1.2em]" /></Button>
            {day !== TODAY && <Button variant="ghost" size="sm" onClick={() => setDay(TODAY)}>Aujourd’hui</Button>}
            <h2 className="ms-[0.5em] font-display text-h3 font-semibold text-fg first-letter:uppercase">{WEEKDAYS[weekday(day)]} {dateLong(day).replace(/^1er/, "1er")}</h2>
          </div>

          <div className="mb-[1.25em] grid grid-cols-2 gap-[1em] lg:grid-cols-5">
            <KpiCard label="Présents" value={`${int(stats.present)}/${int(stats.total)}`} hint={stats.total ? `${Math.round((stats.present / stats.total) * 100)} %` : ""} accent />
            <KpiCard label="Retards" value={int(stats.late)} hint="après 08:10" />
            <KpiCard label="Absents" value={int(stats.absent)} hint={day === TODAY ? "non pointés inclus" : "sans justificatif"} />
            <KpiCard label="Télétravail" value={int(stats.remote)} hint={stats.leave ? `${stats.leave} en congé` : ""} />
            <KpiCard label="Heures moyennes" value={fmtHours(stats.avg ?? fallbackAvg)} hint={stats.avg != null ? "sur la journée" : fallbackAvg != null ? "moy. 5 derniers jours" : "journée en cours"} />
          </div>

          <div className="grid items-start gap-[1.25em] xl:grid-cols-[minmax(0,1fr)_25em]">
            <div className="min-w-0">
              {nonWorking ? (
                <Card padded={false}><EmptyState icon={ClipboardCheck} title="Jour non travaillé" description={`${nonWorking}. Aucun pointage n'est attendu ce jour-là.`} action={<Button variant="secondary" onClick={() => setDay(TODAY)}>Revenir à aujourd’hui</Button>} /></Card>
              ) : (
                <>
                  <div className="mb-[0.9em] flex flex-wrap items-center gap-[0.6em]">
                    <Segmented size="sm" value={filter} onChange={setFilter} options={FILTERS} />
                    <SearchInput className="w-[15em]" placeholder="Rechercher un salarié…" value={q} onChange={setQ} />
                  </div>
                  <DataTable
                    columns={columns}
                    rows={shown}
                    density="comfortable"
                    pageSize={12}
                    empty={<EmptyState icon={ClipboardCheck} title={q || filter !== "all" ? "Aucun salarié ne correspond" : "Aucun salarié attendu"} description="Modifiez le filtre ou la recherche." action={<Button variant="secondary" onClick={() => { setQ(""); setFilter("all"); }}>Effacer les filtres</Button>} />}
                  />
                </>
              )}
            </div>
            <div className="flex flex-col gap-[1.25em]">
              <ClockCard />
              {(me.role === "admin" || me.role === "hr") && <TerminalsPanel />}
            </div>
          </div>
        </>
      )}
    </>
  );
}
