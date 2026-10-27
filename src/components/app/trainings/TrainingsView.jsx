"use client";

import { useMemo, useState } from "react";
import { CalendarDays, GraduationCap, List, Plus, ShieldAlert, Users, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Card, ConfirmDialog, DataTable, EmptyState, KpiCard, PageHeader, Progress, SearchInput, Segmented, SelectInput, StatusBadge, toast } from "@/components/ui";
import { db, useCollection } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { date, money, int } from "@/lib/format";
import AccessGate from "@/components/app/_kit/AccessGate";
import { teamOf } from "@/components/app/_kit/metrics";
import ComplianceBanner from "./ComplianceBanner";
import TrainingCalendar from "./TrainingCalendar";
import TrainingDrawer from "./TrainingDrawer";
import TrainingCreateModal from "./TrainingCreateModal";
import { ANNUAL_BUDGET, TRAINING_STATUS, mandatoryCompliance, statusOf, yearOf } from "./helpers";

function AvatarStack({ ids, employees, max = 4 }) {
  const people = ids.map((id) => employees.find((e) => e.id === id)).filter(Boolean);
  return (
    <span className="flex items-center">
      <span className="flex -space-x-[0.5em]">
        {people.slice(0, max).map((e) => <Avatar key={e.id} employee={e} size="sm" className="ring-2 ring-surface" />)}
      </span>
      {people.length > max && <span className="ms-[0.5em] text-xs text-fg-muted num">+{people.length - max}</span>}
    </span>
  );
}

function Content({ user }) {
  const trainings = useCollection("trainings");
  const employees = useCollection("employees");
  const departments = useCollection("departments");

  const [view, setView] = useState("list");
  const [q, setQ] = useState("");
  const [year, setYear] = useState(TODAY.slice(0, 4));
  const [status, setStatus] = useState("");
  const [mine, setMine] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [create, setCreate] = useState(null); // null | { preset, key }
  const [cancelTarget, setCancelTarget] = useState(null);

  const canManage = user.role === "admin" || user.role === "hr";
  const manageableIds = useMemo(
    () => (user.role === "manager" ? new Set(teamOf(employees, departments, user.employeeId).map((e) => e.id)) : new Set()),
    [employees, departments, user.role, user.employeeId],
  );

  const years = useMemo(() => [...new Set([TODAY.slice(0, 4), ...trainings.map(yearOf)])].sort().reverse(), [trainings]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return trainings
      .filter((t) => yearOf(t) === year)
      .filter((t) => !status || statusOf(t) === status)
      .filter((t) => !mine || t.participantIds.includes(user.employeeId))
      .filter((t) => !needle || `${t.title} ${t.provider}`.toLowerCase().includes(needle))
      .sort((a, b) => a.from.localeCompare(b.from));
  }, [trainings, q, year, status, mine, user.employeeId]);

  const yearAll = useMemo(() => trainings.filter((t) => yearOf(t) === year && statusOf(t) !== "cancelled"), [trainings, year]);
  const spent = yearAll.filter((t) => statusOf(t) === "done").reduce((s, t) => s + t.cost, 0);
  const committed = yearAll.filter((t) => statusOf(t) !== "done").reduce((s, t) => s + t.cost, 0);
  const seatsTaken = yearAll.reduce((s, t) => s + t.participantIds.length, 0);
  const compliance = useMemo(() => mandatoryCompliance(trainings, employees), [trainings, employees]);
  const covered = compliance.reduce((s, c) => s + c.trained, 0);
  const required = compliance.reduce((s, c) => s + c.total, 0);
  const budgetUsed = Math.round(((spent + committed) / ANNUAL_BUDGET) * 100);
  const filtersOn = q || status || mine || year !== TODAY.slice(0, 4);

  const clear = () => { setQ(""); setStatus(""); setMine(false); setYear(TODAY.slice(0, 4)); };
  const openCreate = (preset) => setCreate({ preset, key: Date.now() });

  const enrollMissing = (item) => {
    const left = item.next.seats - item.next.participantIds.length;
    const add = item.missing.slice(0, left).map((e) => e.id);
    db.patch("trainings", item.next.id, { participantIds: [...item.next.participantIds, ...add] });
    db.audit(user.employeeId, "Inscriptions en masse", item.title, `${add.length} salarié(s)`);
    toast.success(`${add.length} salarié${add.length > 1 ? "s" : ""} inscrit${add.length > 1 ? "s" : ""} à « ${item.title} ».`);
  };

  const columns = [
    {
      key: "title",
      header: "Formation",
      cell: (t) => (
        <span className="block min-w-[14em]">
          <span className="block font-medium text-fg">{t.title}</span>
          <span className="block text-xs text-fg-muted">{t.provider}</span>
        </span>
      ),
    },
    { key: "from", header: "Dates", className: "whitespace-nowrap", cell: (t) => <span className="num">{t.from === t.to ? date(t.from) : `${date(t.from)} → ${date(t.to)}`}</span> },
    {
      key: "participants",
      header: "Participants",
      sortValue: (t) => t.participantIds.length,
      cell: (t) => (
        <span className="flex items-center gap-[0.8em]">
          <AvatarStack ids={t.participantIds} employees={employees} />
          <span className="text-xs text-fg-muted num">{t.participantIds.length}/{t.seats}</span>
        </span>
      ),
    },
    { key: "cost", header: "Coût", align: "end", cell: (t) => money(t.cost, { decimals: 0 }) },
    {
      key: "status",
      header: "Statut",
      sortValue: (t) => statusOf(t),
      cell: (t) => (
        <span className="flex flex-wrap items-center gap-[0.4em]">
          <StatusBadge status={statusOf(t)} map={TRAINING_STATUS} />
          {t.mandatory && <Badge tone="warning" icon={ShieldAlert}>Obligatoire</Badge>}
          {t.participantIds.includes(user.employeeId) && <Badge tone="brand" dot={false}>Inscrit</Badge>}
        </span>
      ),
    },
  ];

  const openTraining = trainings.find((t) => t.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Formations"
        description="Planifiez les sessions, suivez le budget et assurez-vous que les formations obligatoires sont à jour."
        actions={canManage && <Button icon={Plus} onClick={() => openCreate()}>Créer une formation</Button>}
      />

      <div className="mb-[1.5em] grid grid-cols-2 gap-[1em] lg:grid-cols-4">
        <KpiCard label={`Sessions ${year}`} value={int(yearAll.length)} icon={GraduationCap} hint={`${yearAll.filter((t) => statusOf(t) === "planned").length} à venir`} />
        <KpiCard label="Inscriptions" value={int(seatsTaken)} icon={Users} hint="places occupées" />
        <KpiCard label="Conformité obligatoire" value={required ? `${Math.round((covered / required) * 100)} %` : "—"} icon={ShieldAlert} hint={`${covered} / ${required} formés`} />
        <Card className="!p-[1.25em]">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Budget formation</p>
            <Wallet className="size-[1.15em] text-fg-faint" aria-hidden strokeWidth={1.6} />
          </div>
          <p className="mt-[0.5em] font-display text-kpi font-semibold text-fg num">{budgetUsed} %</p>
          <Progress className="mt-[0.5em]" value={spent + committed} max={ANNUAL_BUDGET} tone={budgetUsed > 100 ? "danger" : budgetUsed > 85 ? "warning" : "primary"} />
          <p className="mt-[0.5em] text-xs text-fg-muted num">{money(spent + committed, { decimals: 0 })} engagés sur {money(ANNUAL_BUDGET, { decimals: 0 })}</p>
        </Card>
      </div>

      <div className="mb-[1.5em]">
        <ComplianceBanner items={compliance} canManage={canManage} onEnrollMissing={enrollMissing} onPlan={(item) => openCreate({ title: item.title, mandatory: true })} />
      </div>

      <div className="mb-[1em] flex flex-wrap items-center gap-[0.7em]">
        <SearchInput className="w-full sm:w-[17em]" placeholder="Rechercher une formation…" value={q} onChange={setQ} />
        <SelectInput aria-label="Année" className="w-[8em]" value={year} onChange={setYear} options={years} />
        <SelectInput aria-label="Statut" className="w-[11em]" value={status} onChange={setStatus} placeholder="Tous les statuts" options={Object.entries(TRAINING_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
        <Segmented value={mine ? "mine" : "all"} onChange={(v) => setMine(v === "mine")} options={[{ value: "all", label: "Toutes" }, { value: "mine", label: "Mes formations" }]} />
        {filtersOn && <Button variant="ghost" size="sm" onClick={clear}>Effacer les filtres</Button>}
        <div className="ms-auto">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: <span className="inline-flex items-center gap-[0.4em]"><List className="size-[1.1em]" aria-hidden />Liste</span> },
              { value: "calendar", label: <span className="inline-flex items-center gap-[0.4em]"><CalendarDays className="size-[1.1em]" aria-hidden />Calendrier</span> },
            ]}
          />
        </div>
      </div>

      {view === "list" ? (
        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={(t) => setOpenId(t.id)}
          defaultSort={{ key: "from", dir: "asc" }}
          empty={
            filtersOn ? (
              <EmptyState icon={GraduationCap} title="Aucune formation ne correspond" description="Élargissez la recherche ou changez d'année." action={<Button variant="secondary" onClick={clear}>Effacer les filtres</Button>} />
            ) : (
              <EmptyState icon={GraduationCap} title="Aucune formation planifiée" description="Créez la première session pour suivre les inscriptions, les coûts et les justificatifs." action={canManage && <Button icon={Plus} onClick={() => openCreate()}>Créer une formation</Button>} />
            )
          }
        />
      ) : (
        <TrainingCalendar trainings={filtered} onOpen={setOpenId} />
      )}

      <TrainingDrawer
        key={openId ?? "none"}
        training={openTraining}
        employees={employees}
        user={user}
        manageableIds={manageableIds}
        canManage={canManage}
        onClose={() => setOpenId(null)}
        onCancel={setCancelTarget}
      />
      {create && <TrainingCreateModal key={create.key} open preset={create.preset} actorId={user.employeeId} onClose={(id) => { setCreate(null); if (id) setOpenId(id); }} />}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        danger
        title="Annuler cette session ?"
        description={cancelTarget ? `« ${cancelTarget.title} » sera marquée comme annulée et ses ${cancelTarget.participantIds.length} inscrits seront notifiés.` : ""}
        confirmLabel="Annuler la session"
        onConfirm={() => {
          db.patch("trainings", cancelTarget.id, { status: "cancelled" });
          db.audit(user.employeeId, "Formation annulée", cancelTarget.title, "");
          toast.warning("Session annulée.");
          setOpenId(null);
        }}
      />
    </>
  );
}

export default function TrainingsView() {
  return <AccessGate>{(user) => <Content user={user} />}</AccessGate>;
}
