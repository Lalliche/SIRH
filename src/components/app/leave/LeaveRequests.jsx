"use client";

import { PageSkeleton } from "@/components/app/_kit/Skeleton";
import { useMemo, useState } from "react";
import { Check, CalendarPlus, Lock, X } from "lucide-react";
import { Badge, Button, DataTable, Drawer, EmptyState, KpiCard, PageHeader, PersonCell, SearchInput, Segmented, SelectInput, StatusBadge } from "@/components/ui";
import { LEAVE_STATUS, LEAVE_TYPES } from "@/data/constants";
import { CURRENT_PERIOD, TODAY } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { useCollection, useDb } from "@/lib/db";
import { date, fullName, int } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { useDecisions } from "@/components/app/inbox/use-decisions";
import LeaveContext from "./LeaveContext";
import LeaveNav from "./LeaveNav";
import LeaveRequestModal from "./LeaveRequestModal";
import LeaveTypeTag from "./LeaveTypeTag";
import ReasonModal from "./ReasonModal";
import { COVER, PAY_IMPACT, countLeave, coverOf, fmtDays, isConfirmed, payImpactOf, policiesOf, shiftPeriod } from "./leave-utils";
import { approvableEmployees, visibleEmployees } from "./scope";
import { useDirectory } from "./use-directory";

const VIEW_ROLES = ["admin", "hr", "manager", "accountant"];
const MONTH_START = `${CURRENT_PERIOD}-01`;
const MONTH_END = addDays(`${shiftPeriod(CURRENT_PERIOD, 1)}-01`, -1);

export default function LeaveRequests() {
  const me = useCurrentUser();
  const dir = useDirectory();
  const requests = useCollection("leaveRequests");
  const settings = useDb((s) => s.settings);
  const policies = useMemo(() => policiesOf(settings), [settings]);
  const decide = useDecisions();

  const [tab, setTab] = useState("all");
  const [type, setType] = useState("");
  const [dept, setDept] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null); // array of request ids
  const [create, setCreate] = useState(false);

  const visible = useMemo(() => new Set(visibleEmployees(me.role, me.employeeId, dir.employees).map((e) => e.id)), [me.role, me.employeeId, dir.employees]);
  const actionable = useMemo(() => new Set(approvableEmployees(me.role, me.employeeId, dir.employees).map((e) => e.id)), [me.role, me.employeeId, dir.employees]);
  const scoped = useMemo(() => requests.filter((r) => visible.has(r.employeeId) && r.status !== "cancelled"), [requests, visible]);

  const stats = useMemo(() => {
    const monthDays = scoped.filter(isConfirmed).reduce((s, r) => s + countLeave(r.from > MONTH_START ? r.from : MONTH_START, r.to < MONTH_END ? r.to : MONTH_END).working * (r.to >= MONTH_START && r.from <= MONTH_END ? 1 : 0), 0);
    return {
      pending: scoped.filter((r) => r.status === "pending").length,
      today: scoped.filter((r) => isConfirmed(r) && r.from <= TODAY && TODAY <= r.to).length,
      approvedMonth: scoped.filter((r) => r.status === "approved" && (r.decidedAt ?? "").startsWith(CURRENT_PERIOD)).length,
      monthDays,
    };
  }, [scoped]);

  const counts = useMemo(() => ({
    all: scoped.length,
    pending: scoped.filter((r) => r.status === "pending").length,
    approved: scoped.filter(isConfirmed).length,
    rejected: scoped.filter((r) => r.status === "rejected").length,
  }), [scoped]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return scoped
      .filter((r) => tab === "all" || (tab === "approved" ? isConfirmed(r) : r.status === tab))
      .filter((r) => !type || r.type === type)
      .filter((r) => !dept || dir.byId[r.employeeId]?.departmentId === dept)
      .filter((r) => !term || fullName(dir.byId[r.employeeId]).toLowerCase().includes(term))
      .map((r) => ({ ...r, employee: dir.byId[r.employeeId] }));
  }, [scoped, tab, type, dept, q, dir.byId]);

  const filtered = tab !== "all" || type || dept || q;
  const clear = () => { setTab("all"); setType(""); setDept(""); setQ(""); };

  if (!me.ready) return <PageSkeleton />;

  if (!VIEW_ROLES.includes(me.role)) {
    return (
      <>
        <PageHeader title="Demandes de congé" />
        <LeaveNav />
        <EmptyState icon={Lock} title="Accès réservé aux responsables" description="Vos propres demandes sont dans « Mon solde »." action={<Button href="/app/leave">Voir mon solde</Button>} />
      </>
    );
  }

  const entries = (list) => list.filter((r) => r.status === "pending" && actionable.has(r.employeeId)).map((r) => ({ kind: "leave", id: r.id }));
  const approve = (list) => decide(entries(list), "approve");

  const columns = [
    { key: "employee", header: "Salarié", sortValue: (r) => fullName(r.employee), cell: (r) => <PersonCell employee={r.employee} sub={dir.department(r.employee)} /> },
    { key: "type", header: "Type", sortValue: (r) => LEAVE_TYPES[r.type].label, cell: (r) => <LeaveTypeTag type={r.type} /> },
    { key: "from", header: "Dates", width: "11em", cell: (r) => <span className="num whitespace-nowrap">{date(r.from)} → {date(r.to)}</span> },
    { key: "days", header: "Jours", align: "end", cell: (r) => fmtDays(r.days) },
    { key: "cover", header: "Pris en charge par", sortValue: (r) => coverOf(r.type, policies), cell: (r) => { const c = COVER[coverOf(r.type, policies)]; return <Badge tone={c.tone}>{c.label}</Badge>; } },
    { key: "impact", header: "Impact paie", sortValue: (r) => payImpactOf(r.type, policies), cell: (r) => { const p = PAY_IMPACT[payImpactOf(r.type, policies)]; return <Badge tone={p.tone}>{p.label}</Badge>; } },
    { key: "status", header: "Statut", sortValue: (r) => LEAVE_STATUS[r.status].label, cell: (r) => <StatusBadge status={r.status} map={LEAVE_STATUS} /> },
    {
      key: "actions", header: "", sortable: false, align: "end",
      cell: (r) => r.status === "pending" && actionable.has(r.employeeId) ? (
        <span className="inline-flex gap-[0.3em]" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="soft" aria-label={`Approuver la demande de ${fullName(r.employee)}`} onClick={() => approve([r])}><Check className="size-[1.2em]" /></Button>
          <Button size="icon" variant="danger" aria-label={`Refuser la demande de ${fullName(r.employee)}`} onClick={() => setRejecting([r.id])}><X className="size-[1.2em]" /></Button>
        </span>
      ) : null,
    },
  ];

  const openReq = open && requests.find((r) => r.id === open);
  const canAct = openReq && openReq.status === "pending" && actionable.has(openReq.employeeId);

  return (
    <>
      <PageHeader
        title="Demandes de congé"
        description={me.role === "manager" ? "Les demandes de votre équipe." : "Toutes les demandes de l'entreprise, avec leur prise en charge et leur impact sur la paie."}
        actions={(me.role === "admin" || me.role === "hr") && <Button icon={CalendarPlus} onClick={() => setCreate(true)}>Nouvelle absence</Button>}
      />
      <LeaveNav />

      <div className="mb-[1.25em] grid grid-cols-2 gap-[1em] lg:grid-cols-4">
        <KpiCard label="En attente" value={int(stats.pending)} hint="à traiter" accent />
        <KpiCard label="Absents aujourd'hui" value={int(stats.today)} hint="congés en cours" />
        <KpiCard label="Approuvées ce mois" value={int(stats.approvedMonth)} hint="octobre 2026" />
        <KpiCard label="Jours d'absence" value={fmtDays(stats.monthDays)} hint="ouvrés, ce mois" />
      </div>

      <div className="mb-[1em] flex flex-wrap items-center gap-[0.75em]">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: `Toutes · ${counts.all}` },
            { value: "pending", label: `En attente · ${counts.pending}` },
            { value: "approved", label: `Approuvées · ${counts.approved}` },
            { value: "rejected", label: `Refusées · ${counts.rejected}` },
          ]}
        />
        <SearchInput className="w-[16em]" placeholder="Rechercher un salarié…" value={q} onChange={setQ} />
        <SelectInput aria-label="Type de congé" className="w-[13em]" value={type} onChange={setType} placeholder="Tous les types" options={Object.entries(LEAVE_TYPES).map(([value, t]) => ({ value, label: t.label }))} />
        {me.role !== "manager" && <SelectInput aria-label="Service" className="w-[14em]" value={dept} onChange={setDept} placeholder="Tous les services" options={dir.departments.map((d) => ({ value: d.id, label: d.name }))} />}
        {filtered && <Button variant="ghost" size="sm" onClick={clear}>Tout effacer</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        selectable={actionable.size > 0}
        bulkActions={[
          { label: "Approuver", icon: Check, onClick: approve },
          { label: "Refuser", icon: X, onClick: (list) => setRejecting(entries(list).map((e) => e.id)) },
        ]}
        onRowClick={(r) => setOpen(r.id)}
        pageSize={12}
        defaultSort={{ key: "from", dir: "desc" }}
        empty={
          <EmptyState
            icon={CalendarPlus}
            title={filtered ? "Aucune demande ne correspond" : "Aucune demande de congé"}
            description={filtered ? "Modifiez ou effacez les filtres pour élargir la recherche." : "Les demandes de votre équipe apparaîtront ici dès qu'elles seront envoyées."}
            action={filtered ? <Button variant="secondary" onClick={clear}>Effacer les filtres</Button> : null}
          />
        }
      />

      <Drawer
        open={!!openReq}
        onClose={() => setOpen(null)}
        title={openReq ? fullName(dir.byId[openReq.employeeId]) : ""}
        description={openReq ? `Demande du ${date(openReq.createdAt)}` : ""}
        footer={
          openReq && (
            <>
              <Button variant="ghost" onClick={() => setOpen(null)}>Fermer</Button>
              {canAct && <Button variant="danger" icon={X} onClick={() => setRejecting([openReq.id])}>Refuser</Button>}
              {canAct && <Button icon={Check} onClick={() => { approve([openReq]); setOpen(null); }}>Approuver</Button>}
            </>
          )
        }
      >
        {openReq && (
          <div className="flex flex-col gap-[1em]">
            <div className="flex flex-wrap items-center gap-[0.5em]">
              <StatusBadge status={openReq.status} map={LEAVE_STATUS} />
              <Badge tone={COVER[coverOf(openReq.type, policies)].tone}>Pris en charge : {COVER[coverOf(openReq.type, policies)].label}</Badge>
              <Badge tone={PAY_IMPACT[payImpactOf(openReq.type, policies)].tone}>Paie : {PAY_IMPACT[payImpactOf(openReq.type, policies)].label.toLowerCase()}</Badge>
            </div>
            {openReq.rejectReason && <p className="rounded-md bg-danger-bg px-[0.9em] py-[0.6em] text-sm text-danger-fg">Motif du refus : {openReq.rejectReason}</p>}
            {openReq.proof && <p className="text-sm text-fg-secondary">Justificatif joint : <span className="font-medium text-fg">{openReq.proof}</span></p>}
            <LeaveContext request={openReq} />
          </div>
        )}
      </Drawer>

      <ReasonModal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        description={rejecting?.length > 1 ? `${rejecting.length} demandes seront refusées avec ce motif.` : undefined}
        onConfirm={(reason) => { decide(rejecting.map((id) => ({ kind: "leave", id })), "reject", reason); setRejecting(null); setOpen(null); }}
      />
      <LeaveRequestModal open={create} onClose={() => setCreate(false)} allowPick />
    </>
  );
}
