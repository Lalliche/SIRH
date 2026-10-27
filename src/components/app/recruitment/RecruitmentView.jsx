"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, UserCheck, Users } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, KpiCard, PageHeader, SearchInput, SelectInput, StatusBadge } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { useCollection } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { diffDays } from "@/lib/dates";
import { date } from "@/lib/format";
import { FunnelMini } from "./Funnel";
import JobCreateModal from "./JobCreateModal";
import { JOB_STATUS } from "./helpers";

function Content({ user }) {
  const router = useRouter();
  const jobs = useCollection("jobs");
  const candidates = useCollection("candidates");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [create, setCreate] = useState(null);
  const canCreate = user.role === "admin" || user.role === "hr";

  const dept = (id) => departments.find((d) => d.id === id)?.name ?? "—";
  const site = (id) => entities.find((e) => e.id === id)?.name ?? "—";

  const scoped = useMemo(() => {
    if (user.role !== "manager") return jobs;
    const led = new Set(departments.filter((d) => d.headId === user.employeeId).map((d) => d.id));
    return jobs.filter((j) => led.has(j.departmentId));
  }, [jobs, departments, user]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scoped
      .filter((j) => !status || j.status === status)
      .filter((j) => !needle || j.title.toLowerCase().includes(needle))
      .map((j) => ({ ...j, cands: candidates.filter((c) => c.jobId === j.id) }));
  }, [scoped, candidates, q, status]);

  const scopedIds = new Set(scoped.map((j) => j.id));
  const pool = candidates.filter((c) => scopedIds.has(c.jobId));
  const active = pool.filter((c) => !["hired", "rejected"].includes(c.stage));
  const hired = pool.filter((c) => c.stage === "hired");

  const columns = [
    {
      key: "title",
      header: "Offre",
      cell: (j) => (
        <span className="block min-w-[13em]">
          <span className="block font-medium text-fg">{j.title}</span>
          <span className="block text-xs text-fg-muted">{dept(j.departmentId)} · {site(j.entityId)}</span>
        </span>
      ),
    },
    { key: "status", header: "Statut", cell: (j) => <StatusBadge status={j.status} map={JOB_STATUS} /> },
    { key: "cands", header: "Candidats", align: "end", sortValue: (j) => j.cands.length, cell: (j) => j.cands.length },
    { key: "funnel", header: "Pipeline", sortable: false, cell: (j) => <FunnelMini candidates={j.cands} /> },
    { key: "hc", header: "Postes", align: "end", sortValue: (j) => j.headcount, cell: (j) => `${j.cands.filter((c) => c.stage === "hired").length}/${j.headcount}` },
    { key: "openedAt", header: "Ouverte", className: "whitespace-nowrap", cell: (j) => <span className="num">{date(j.openedAt)} <span className="text-xs text-fg-muted">· J+{diffDays(j.openedAt, TODAY)}</span></span> },
  ];

  return (
    <>
      <PageHeader
        title="Recrutement"
        description={user.role === "manager" ? "Les offres de votre service et l'avancement des candidats." : "Suivez chaque offre, de la candidature à l'embauche, et créez la fiche employé en un clic."}
        actions={canCreate && <Button icon={Plus} onClick={() => setCreate(Math.random())}>Créer une offre</Button>}
      />
      <div className="mb-[1.5em] grid grid-cols-2 gap-[1em] lg:grid-cols-4">
        <KpiCard label="Offres ouvertes" value={scoped.filter((j) => j.status === "open").length} icon={Briefcase} hint={`${scoped.length} au total`} />
        <KpiCard label="Candidats en cours" value={active.length} icon={Users} hint="hors embauchés et refusés" />
        <KpiCard label="À traiter" value={pool.filter((c) => c.stage === "new").length} icon={Users} hint="nouvelles candidatures" />
        <KpiCard label="Embauches" value={hired.length} icon={UserCheck} hint={hired.length ? "à convertir en employés" : "aucune pour l'instant"} />
      </div>
      <div className="mb-[1em] flex flex-wrap gap-[0.7em]">
        <SearchInput className="w-full sm:w-[17em]" placeholder="Rechercher une offre…" value={q} onChange={setQ} />
        <SelectInput aria-label="Statut" className="w-[11em]" value={status} onChange={setStatus} placeholder="Tous les statuts" options={Object.entries(JOB_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
        {(q || status) && <Button variant="ghost" size="sm" onClick={() => { setQ(""); setStatus(""); }}>Effacer les filtres</Button>}
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        onRowClick={(j) => router.push(`/app/recruitment/jobs/${j.id}`)}
        empty={
          scoped.length === 0 ? (
            <EmptyState icon={Briefcase} title="Aucune offre pour l'instant" description={canCreate ? "Créez une offre pour recevoir et suivre des candidatures." : "Aucune offre n'est ouverte dans votre service."} action={canCreate && <Button icon={Plus} onClick={() => setCreate(Math.random())}>Créer une offre</Button>} />
          ) : (
            <EmptyState icon={Briefcase} title="Aucune offre ne correspond" action={<Button variant="secondary" onClick={() => { setQ(""); setStatus(""); }}>Effacer les filtres</Button>} />
          )
        }
      />
      {create && <JobCreateModal key={create} open departments={departments} entities={entities} actorId={user.employeeId} onClose={(id) => { setCreate(null); if (id) router.push(`/app/recruitment/jobs/${id}`); }} />}
    </>
  );
}

export default function RecruitmentView() {
  return <AccessGate roles={["admin", "hr", "manager"]}>{(user) => <Content user={user} />}</AccessGate>;
}
