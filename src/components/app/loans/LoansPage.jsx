"use client";

import { useMemo, useState } from "react";
import { Check, HandCoins, Lock, Plus, X } from "lucide-react";
import { Button, DataTable, EmptyState, KpiCard, Money, PageHeader, PersonCell, Progress, SearchInput, Segmented, StatusBadge } from "@/components/ui";
import { PageSkeleton } from "@/components/app/_kit/Skeleton";
import { useDecisions } from "@/components/app/inbox/use-decisions";
import ReasonModal from "@/components/app/leave/ReasonModal";
import { useDirectory } from "@/components/app/leave/use-directory";
import { CURRENT_PERIOD } from "@/lib/clock";
import { useCollection } from "@/lib/db";
import { fullName, int, money } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import AmortizationDrawer from "./AmortizationDrawer";
import NewLoanModal from "./NewLoanModal";
import { LOAN_STATUS, LOAN_TYPES } from "./loan-utils";

const VIEW = ["admin", "hr", "accountant"];

export default function LoansPage() {
  const me = useCurrentUser();
  const dir = useDirectory();
  const loans = useCollection("loans");
  const decide = useDecisions();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [create, setCreate] = useState(false);
  const [rejecting, setRejecting] = useState(null);

  const canEdit = me.role === "admin" || me.role === "hr";
  const all = useMemo(() => loans.map((l) => ({ ...l, employee: dir.byId[l.employeeId] })), [loans, dir.byId]);

  const stats = useMemo(() => {
    const active = all.filter((l) => l.status === "active");
    return {
      lent: all.filter((l) => ["active", "closed"].includes(l.status) && (l.disbursedAt ?? l.startDate).startsWith(CURRENT_PERIOD)).reduce((s, l) => s + l.total, 0),
      expected: active.reduce((s, l) => s + Math.min(l.monthly, l.remaining), 0),
      active: active.length,
      outstanding: active.reduce((s, l) => s + l.remaining, 0),
      pending: all.filter((l) => l.status === "pending"),
    };
  }, [all]);

  const counts = useMemo(() => Object.fromEntries(["all", "pending", "active", "closed", "rejected"].map((t) => [t, t === "all" ? all.length : all.filter((l) => l.status === t).length])), [all]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((l) => (tab === "all" || l.status === tab) && (!term || fullName(l.employee).toLowerCase().includes(term)));
  }, [all, tab, q]);

  if (!me.ready) return <PageSkeleton />;
  if (!VIEW.includes(me.role)) {
    return (
      <>
        <PageHeader title="Prêts & avances" />
        <EmptyState icon={Lock} title="Accès réservé aux RH et à la paie" description="Pour demander une avance sur salaire, faites une demande : elle sera étudiée par les RH." action={<Button href="/app/requests">Faire une demande</Button>} />
      </>
    );
  }

  const totals = { total: money(rows.reduce((s, l) => s + l.total, 0), { decimals: 0 }), monthly: money(rows.filter((l) => l.status === "active").reduce((s, l) => s + l.monthly, 0), { decimals: 0 }), remaining: money(rows.reduce((s, l) => s + (l.status === "active" ? l.remaining : 0), 0), { decimals: 0 }) };
  const clear = () => { setTab("all"); setQ(""); };

  const columns = [
    { key: "employee", header: "Employé", sortValue: (l) => fullName(l.employee), cell: (l) => <PersonCell employee={l.employee} sub={dir.department(l.employee)} /> },
    { key: "type", header: "Type", sortValue: (l) => l.type, cell: (l) => LOAN_TYPES[l.type]?.short },
    { key: "total", header: "Montant total", align: "end", sortValue: (l) => l.total, cell: (l) => <Money value={l.total} decimals={0} /> },
    { key: "monthly", header: "Mensualité", align: "end", sortValue: (l) => l.monthly, cell: (l) => <Money value={l.monthly} decimals={0} /> },
    {
      key: "remaining", header: "Reste à payer", align: "end", sortValue: (l) => l.remaining,
      cell: (l) => (
        <span className="inline-flex flex-col items-end gap-[0.3em]">
          <Money value={l.remaining} decimals={0} />
          {l.status === "active" && <Progress className="w-[5em]" value={l.total - l.remaining} max={l.total} />}
        </span>
      ),
    },
    { key: "status", header: "Statut", sortValue: (l) => l.status, cell: (l) => <StatusBadge status={l.status} map={LOAN_STATUS} /> },
    {
      key: "actions", header: "", sortable: false, align: "end",
      cell: (l) => canEdit && l.status === "pending" ? (
        <span className="inline-flex gap-[0.3em]" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="soft" icon={Check} onClick={() => decide([{ kind: "loan", id: l.id }], "approve")}>Approuver</Button>
          <Button size="icon" variant="danger" aria-label={`Refuser la demande de ${fullName(l.employee)}`} onClick={() => setRejecting(l)}><X className="size-[1.2em]" /></Button>
        </span>
      ) : null,
    },
  ];

  const openLoan = open && all.find((l) => l.id === open);

  return (
    <>
      <PageHeader
        title="Prêts & avances"
        description="Suivi des avances sur salaire et prêts sociaux, remboursés par retenue automatique sur la paie."
        actions={canEdit && <Button icon={Plus} onClick={() => setCreate(true)}>Nouveau prêt</Button>}
      />

      <div className="mb-[1.25em] grid grid-cols-1 gap-[1em] sm:grid-cols-3">
        <KpiCard label="Prêté ce mois" value={money(stats.lent, { decimals: 0 })} hint={stats.pending.length ? `${stats.pending.length} en attente (${money(stats.pending.reduce((s, l) => s + l.total, 0), { decimals: 0 })})` : "octobre 2026"} icon={HandCoins} />
        <KpiCard label="Remboursements attendus" value={money(stats.expected, { decimals: 0 })} hint="retenues de la paie d'octobre" accent />
        <KpiCard label="Prêts actifs" value={int(stats.active)} hint={`${money(stats.outstanding, { decimals: 0 })} restant dû`} />
      </div>

      <div className="mb-[1em] flex flex-wrap items-center gap-[0.75em]">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: `Tous · ${counts.all}` },
            { value: "pending", label: `En attente · ${counts.pending}` },
            { value: "active", label: `En cours · ${counts.active}` },
            { value: "closed", label: `Soldés · ${counts.closed}` },
            ...(counts.rejected ? [{ value: "rejected", label: `Refusés · ${counts.rejected}` }] : []),
          ]}
        />
        <SearchInput className="w-[16em]" placeholder="Rechercher un salarié…" value={q} onChange={setQ} />
        {(tab !== "all" || q) && <Button variant="ghost" size="sm" onClick={clear}>Tout effacer</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        density="comfortable"
        pageSize={10}
        onRowClick={(l) => setOpen(l.id)}
        footerRow={rows.length > 1 ? totals : undefined}
        empty={
          tab !== "all" || q ? (
            <EmptyState icon={HandCoins} title="Aucun prêt ne correspond" description="Modifiez la recherche ou changez d'onglet." action={<Button variant="secondary" onClick={clear}>Effacer les filtres</Button>} />
          ) : (
            <EmptyState icon={HandCoins} title="Aucun prêt ni avance" description="Les avances et prêts sociaux accordés apparaîtront ici avec leur échéancier." action={canEdit && <Button icon={Plus} onClick={() => setCreate(true)}>Nouveau prêt</Button>} />
          )
        }
      />
      {rows.length > 1 && <p className="mt-[0.6em] text-xs text-fg-muted">Total des lignes affichées ; mensualité et reste à payer comptent les prêts en cours. Cliquez une ligne pour ouvrir l’échéancier.</p>}

      <AmortizationDrawer loan={openLoan} employee={openLoan?.employee} department={dir.department(openLoan?.employee)} canEdit={canEdit} onClose={() => setOpen(null)} />
      <NewLoanModal open={create} onClose={() => setCreate(false)} />
      <ReasonModal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        description={rejecting ? `${fullName(rejecting.employee)} · ${money(rejecting.total, { decimals: 0 })}` : undefined}
        presets={["Capacité de remboursement insuffisante", "Prêt déjà en cours", "Montant au-dessus de la politique interne"]}
        onConfirm={(reason) => { decide([{ kind: "loan", id: rejecting.id }], "reject", reason); setRejecting(null); }}
      />
    </>
  );
}
