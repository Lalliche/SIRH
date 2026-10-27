"use client";

import { PageSkeleton } from "@/components/app/_kit/Skeleton";
import { useMemo, useState } from "react";
import { CalendarCheck2, CalendarPlus, ChevronDown, Info, Inbox, Undo2, Users } from "lucide-react";
import { Avatar, Button, Card, CardHeader, DataTable, EmptyState, PageHeader, Progress, StatusBadge, toast } from "@/components/ui";
import { LEAVE_STATUS, LEAVE_TYPES } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { db, useCollection, useDb } from "@/lib/db";
import { date, dateShort, fullName } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import LeaveNav from "./LeaveNav";
import LeaveRequestModal from "./LeaveRequestModal";
import LeaveTypeTag from "./LeaveTypeTag";
import { fmtDays, isConfirmed, leaveBalance, policiesOf } from "./leave-utils";
import { canApprove, approvableEmployees } from "./scope";
import { useDirectory } from "./use-directory";

function BalanceCard({ bal, accrual }) {
  const [open, setOpen] = useState(false);
  const low = bal.available <= 3;
  return (
    <Card className="flex flex-col gap-[1em]">
      <div className="flex items-start justify-between gap-[1em]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Solde de congé annuel</p>
          <p className="mt-[0.3em] font-display text-[3.2em] font-semibold leading-none text-fg num">
            {String(Math.round(bal.remaining * 10) / 10).replace(".", ",")}
            <span className="ms-[0.2em] text-base font-medium text-fg-secondary">jours disponibles</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" iconEnd={ChevronDown} aria-expanded={open} onClick={() => setOpen((o) => !o)}>Comment c’est calculé ?</Button>
      </div>
      <div>
        <Progress value={bal.taken} max={Math.max(bal.acquired, 1)} tone={low ? "warning" : "primary"} />
        <dl className="mt-[0.7em] grid grid-cols-3 gap-[0.75em] text-sm">
          <div><dt className="text-fg-muted">Acquis</dt><dd className="font-medium text-fg num">{fmtDays(bal.acquired)}</dd></div>
          <div><dt className="text-fg-muted">Pris</dt><dd className="font-medium text-fg num">{fmtDays(bal.taken)}</dd></div>
          <div><dt className="text-fg-muted">En attente</dt><dd className="font-medium text-fg num">{fmtDays(bal.pending)}</dd></div>
        </dl>
      </div>
      {open && (
        <div className="rounded-md bg-primary-soft px-[1em] py-[0.8em] text-sm text-fg-secondary">
          <p className="mb-[0.3em] flex items-center gap-[0.5em] font-medium text-fg"><Info className="size-[1.1em]" aria-hidden /> Acquisition des congés</p>
          Vous acquérez <strong className="font-medium text-fg">{String(accrual.perMonth).replace(".", ",")} jour par mois travaillé</strong>, dans la limite de <strong className="font-medium text-fg">{accrual.cap} jours par an</strong>.
          Solde = acquis ({fmtDays(bal.acquired)}) − pris ({fmtDays(bal.taken)}) = <strong className="font-medium text-fg">{fmtDays(bal.remaining)}</strong>.
          <span className="mt-[0.3em] block text-xs text-fg-muted">Les jours fériés et les week-ends (vendredi, samedi) ne consomment pas de solde. Règle de report et période de référence : à confirmer avec votre convention.</span>
        </div>
      )}
    </Card>
  );
}

function TeamToday({ scoped, requests, dir, pending }) {
  const ids = new Set(scoped.map((e) => e.id));
  const absent = requests.filter((r) => ids.has(r.employeeId) && isConfirmed(r) && r.from <= TODAY && TODAY <= r.to);
  return (
    <Card>
      <CardHeader title="Mon équipe aujourd'hui" description={`${absent.length} absent${absent.length > 1 ? "s" : ""} sur ${scoped.length}`} />
      {absent.length === 0 ? (
        <p className="text-sm text-fg-secondary">Tout le monde est là aujourd’hui.</p>
      ) : (
        <ul className="flex flex-col gap-[0.6em]">
          {absent.slice(0, 5).map((r) => {
            const e = dir.byId[r.employeeId];
            return (
              <li key={r.id} className="flex items-center gap-[0.65em] text-sm">
                <Avatar employee={e} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{fullName(e)}</span>
                <LeaveTypeTag type={r.type} className="text-xs text-fg-muted" />
                <span className="num text-xs text-fg-muted">→ {dateShort(r.to)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-[1em] flex flex-wrap gap-[0.5em]">
        <Button size="sm" variant={pending ? "primary" : "secondary"} icon={Inbox} href="/app/inbox">
          {pending ? `${pending} en attente` : "Approbations"}
        </Button>
        <Button size="sm" variant="secondary" icon={Users} href="/app/leave/calendar">Calendrier d’équipe</Button>
      </div>
    </Card>
  );
}

export default function LeaveHome() {
  const me = useCurrentUser();
  const dir = useDirectory();
  const requests = useCollection("leaveRequests");
  const settings = useDb((s) => s.settings);
  const policies = useMemo(() => policiesOf(settings), [settings]);
  const [modal, setModal] = useState(false);

  const emp = me.employee;
  const bal = useMemo(() => leaveBalance(emp, requests, undefined, policies.accrual.cap), [emp, requests, policies]);
  const mine = useMemo(() => requests.filter((r) => r.employeeId === me.employeeId).sort((a, b) => b.from.localeCompare(a.from)), [requests, me.employeeId]);
  const next = useMemo(() => mine.filter((r) => ["approved", "pending"].includes(r.status) && r.to >= TODAY).sort((a, b) => a.from.localeCompare(b.from))[0], [mine]);
  const takenByType = useMemo(() => {
    const out = {};
    mine.filter((r) => isConfirmed(r) && r.from.startsWith("2026") && r.type !== "annual").forEach((r) => { out[r.type] = (out[r.type] ?? 0) + r.days; });
    return out;
  }, [mine]);

  const scoped = useMemo(() => approvableEmployees(me.role, me.employeeId, dir.employees).filter((e) => e.status !== "sorti"), [me.role, me.employeeId, dir.employees]);
  const pendingTeam = useMemo(() => {
    const ids = new Set(scoped.map((e) => e.id));
    return requests.filter((r) => r.status === "pending" && ids.has(r.employeeId)).length;
  }, [scoped, requests]);

  const cancel = (r) => {
    const before = r;
    db.patch("leaveRequests", r.id, { status: "cancelled" });
    db.audit(me.employeeId, "Congé annulé", fullName(emp), `${LEAVE_TYPES[r.type].label} · ${dateShort(r.from)} → ${dateShort(r.to)}`);
    toast.success("Demande annulée", { action: { label: "Rétablir", onClick: () => db.update("leaveRequests", (l) => l.map((x) => (x.id === before.id ? before : x))) } });
  };

  const columns = [
    { key: "type", header: "Type", cell: (r) => <LeaveTypeTag type={r.type} className="font-medium text-fg" />, sortValue: (r) => LEAVE_TYPES[r.type].label },
    { key: "from", header: "Dates", cell: (r) => <span className="num whitespace-nowrap">{date(r.from)} → {date(r.to)}</span> },
    { key: "days", header: "Jours", align: "end", cell: (r) => fmtDays(r.days) },
    { key: "status", header: "Statut", cell: (r) => <StatusBadge status={r.status} map={LEAVE_STATUS} />, sortValue: (r) => LEAVE_STATUS[r.status].label },
    {
      key: "actions", header: "", sortable: false, align: "end",
      cell: (r) => (r.status === "pending" ? <Button size="sm" variant="ghost" icon={Undo2} onClick={(e) => { e.stopPropagation(); cancel(r); }}>Annuler</Button> : r.rejectReason ? <span className="text-xs text-fg-muted" title={r.rejectReason}>Motif : {r.rejectReason}</span> : null),
    },
  ];

  if (!me.ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title="Congés & absences"
        description="Votre solde, vos demandes et l'historique de vos absences."
        actions={<Button icon={CalendarPlus} onClick={() => setModal(true)}>Poser un congé</Button>}
      />
      <LeaveNav />

      <div className="grid gap-[1.25em] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-[1.25em]">
          <BalanceCard bal={bal} accrual={policies.accrual} />
          {Object.keys(takenByType).length > 0 && (
            <Card>
              <CardHeader title="Autres absences en 2026" description="Jours approuvés ou pris, hors congé annuel." />
              <ul className="grid gap-[0.75em] sm:grid-cols-2">
                {Object.entries(takenByType).map(([t, d]) => (
                  <li key={t} className="flex items-center justify-between rounded-md bg-surface-2 px-[0.9em] py-[0.6em] text-sm">
                    <LeaveTypeTag type={t} className="text-fg-secondary" />
                    <span className="font-medium text-fg num">{fmtDays(d)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-[1.25em]">
          <Card>
            <CardHeader title="Prochaine absence" />
            {next ? (
              <div className="flex items-start gap-[0.8em]">
                <CalendarCheck2 className="mt-[0.2em] size-[1.5em] text-pine-600" aria-hidden strokeWidth={1.5} />
                <div>
                  <LeaveTypeTag type={next.type} className="font-medium text-fg" />
                  <p className="num text-sm text-fg-secondary">{date(next.from)} → {date(next.to)} · {fmtDays(next.days)}</p>
                  <div className="mt-[0.4em]"><StatusBadge status={next.status} map={LEAVE_STATUS} /></div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-fg-secondary">Aucune absence prévue. Pensez à poser vos jours avant la fin de la période.</p>
            )}
          </Card>
          {canApprove(me.role) && <TeamToday scoped={scoped} requests={requests} dir={dir} pending={pendingTeam} />}
        </div>
      </div>

      <section className="mt-[2em]" aria-labelledby="hist">
        <h2 id="hist" className="mb-[0.8em] font-sans text-h3 font-semibold text-fg">Mes demandes</h2>
        <DataTable
          columns={columns}
          rows={mine}
          pageSize={8}
          density="comfortable"
          defaultSort={{ key: "from", dir: "desc" }}
          empty={<EmptyState icon={CalendarPlus} title="Aucune demande pour le moment" description="Posez votre premier congé : le décompte des jours ouvrés et l'impact sur votre solde sont calculés en direct." action={<Button icon={CalendarPlus} onClick={() => setModal(true)}>Poser un congé</Button>} />}
        />
      </section>

      <LeaveRequestModal open={modal} onClose={() => setModal(false)} onCreated={() => toast.success("Demande envoyée à votre responsable")} />
    </>
  );
}
