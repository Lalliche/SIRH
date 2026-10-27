"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, KanbanSquare, List, Plus, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, DataTable, EmptyState, PageHeader, Segmented, SelectInput, StatusBadge, toast } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { db, useCollection } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { date } from "@/lib/format";
import { Funnel } from "./Funnel";
import KanbanBoard from "./KanbanBoard";
import CandidateDrawer from "./CandidateDrawer";
import AddCandidateModal from "./AddCandidateModal";
import { JOB_STATUS, STAGES, STAGE_BY_KEY, daysInStage, employeeLink, scorecardAverage } from "./helpers";

function Content({ user, jobId }) {
  const router = useRouter();
  const jobs = useCollection("jobs");
  const allCandidates = useCollection("candidates");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const employees = useCollection("employees");
  const [view, setView] = useState("board");
  const [openId, setOpenId] = useState(null);
  const [add, setAdd] = useState(null);
  const [live, setLive] = useState("");

  const job = jobs.find((j) => j.id === jobId);
  const candidates = useMemo(() => allCandidates.filter((c) => c.jobId === jobId), [allCandidates, jobId]);
  const canEdit = user.role === "admin" || user.role === "hr";
  const allowed = job && (user.role !== "manager" || departments.find((d) => d.id === job.departmentId)?.headId === user.employeeId);

  if (!job || !allowed) {
    return <EmptyState icon={Briefcase} title="Offre introuvable" description="Cette offre n'existe pas ou n'est pas dans votre périmètre." action={<Button href="/app/recruitment">Retour aux offres</Button>} />;
  }

  const hired = candidates.filter((c) => c.stage === "hired").length;
  const move = (c, stage) => {
    if (!canEdit && user.role !== "manager") return;
    const from = c.stage;
    db.patch("candidates", c.id, { stage, stageAt: TODAY });
    db.audit(user.employeeId, "Candidat déplacé", c.name, `${STAGE_BY_KEY[from].label} → ${STAGE_BY_KEY[stage].label}`);
    setLive(`${c.name} déplacé vers ${STAGE_BY_KEY[stage].label}.`);
    if (stage === "hired") {
      toast.success(`${c.name} est embauché(e).`, { action: { label: "Créer l'employé", onClick: () => router.push(employeeLink({ ...c, stage }, job)) } });
    } else {
      toast.info(`${c.name} → ${STAGE_BY_KEY[stage].label}`, { duration: 4000, action: { label: "Annuler", onClick: () => db.patch("candidates", c.id, { stage: from, stageAt: c.stageAt ?? c.appliedAt }) } });
    }
  };

  const dept = departments.find((d) => d.id === job.departmentId)?.name;
  const site = entities.find((e) => e.id === job.entityId)?.name;
  const openCandidate = candidates.find((c) => c.id === openId) ?? null;

  const columns = [
    { key: "name", header: "Candidat", cell: (c) => <span className="flex items-center gap-[0.7em]"><Avatar name={c.name} size="sm" /><span className="font-medium text-fg">{c.name}</span></span> },
    { key: "stage", header: "Étape", sortValue: (c) => STAGES.findIndex((s) => s.key === c.stage), cell: (c) => <Badge tone={STAGE_BY_KEY[c.stage].tone}>{STAGE_BY_KEY[c.stage].label}</Badge> },
    { key: "source", header: "Source" },
    { key: "score", header: "Adéquation", align: "end" },
    { key: "sc", header: "Évaluation", align: "end", sortValue: (c) => scorecardAverage(c) ?? 0, cell: (c) => (scorecardAverage(c) != null ? `${String(scorecardAverage(c)).replace(".", ",")} / 5` : "—") },
    { key: "days", header: "Dans l'étape", align: "end", sortValue: daysInStage, cell: (c) => `J+${daysInStage(c)}` },
    { key: "appliedAt", header: "Reçue le", cell: (c) => <span className="num">{date(c.appliedAt)}</span> },
  ];

  return (
    <>
      <Link href="/app/recruitment" className="mb-[0.8em] inline-flex items-center gap-[0.4em] text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-[1.1em]" aria-hidden />Toutes les offres</Link>
      <PageHeader
        title={job.title}
        description={`${dept} · ${site} · ouverte le ${date(job.openedAt)}`}
        actions={
          <>
            {canEdit && (
              <SelectInput aria-label="Statut de l'offre" className="w-[10em]" value={job.status} onChange={(v) => { db.patch("jobs", job.id, { status: v }); db.audit(user.employeeId, "Statut d'offre modifié", job.title, JOB_STATUS[v].label); }} options={Object.entries(JOB_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
            )}
            {canEdit && <Button icon={Plus} onClick={() => setAdd(Math.random())}>Ajouter un candidat</Button>}
          </>
        }
      />

      <div className="mb-[1.25em] grid gap-[1em] lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Entonnoir" description={`${candidates.length} candidature${candidates.length > 1 ? "s" : ""}`} action={<StatusBadge status={job.status} map={JOB_STATUS} />} />
          <Funnel candidates={candidates} />
        </Card>
        <Card className="flex flex-col justify-between">
          <CardHeader title="Postes pourvus" />
          <p className="font-display text-kpi font-semibold text-fg num">{hired} <span className="text-h3 font-normal text-fg-muted">/ {job.headcount}</span></p>
          <p className="mt-[0.5em] text-sm text-fg-secondary">{hired >= job.headcount ? "Tous les postes sont pourvus. Pensez à clôturer l'offre." : `${job.headcount - hired} poste${job.headcount - hired > 1 ? "s" : ""} restant${job.headcount - hired > 1 ? "s" : ""}.`}</p>
          {candidates.filter((c) => c.stage === "hired" && !c.convertedAt).length > 0 && canEdit && (
            <Button className="mt-[1em] self-start" variant="soft" icon={UserPlus} href={employeeLink(candidates.find((c) => c.stage === "hired" && !c.convertedAt), job)}>Créer la fiche employé</Button>
          )}
        </Card>
      </div>

      <div className="mb-[1em] flex items-center justify-between gap-[1em]">
        <p className="text-sm text-fg-muted">Glissez une carte par sa poignée, ou utilisez les flèches de chaque carte.</p>
        <Segmented value={view} onChange={setView} options={[{ value: "board", label: <span className="inline-flex items-center gap-[0.4em]"><KanbanSquare className="size-[1.1em]" aria-hidden />Pipeline</span> }, { value: "list", label: <span className="inline-flex items-center gap-[0.4em]"><List className="size-[1.1em]" aria-hidden />Liste</span> }]} />
      </div>

      {candidates.length === 0 ? (
        <EmptyState icon={UserPlus} title="Aucun candidat pour cette offre" description="Ajoutez les candidatures reçues par ANEM, Emploitic, LinkedIn ou recommandation." action={canEdit && <Button icon={Plus} onClick={() => setAdd(Math.random())}>Ajouter un candidat</Button>} />
      ) : view === "board" ? (
        <KanbanBoard candidates={candidates} onOpen={setOpenId} onMove={move} />
      ) : (
        <DataTable columns={columns} rows={candidates} onRowClick={(c) => setOpenId(c.id)} defaultSort={{ key: "stage", dir: "asc" }} />
      )}
      <p role="status" aria-live="polite" className="sr-only">{live}</p>

      <CandidateDrawer key={openId ?? "none"} candidate={openCandidate} job={job} employees={employees} user={user} canEdit={canEdit} onMove={move} onClose={() => setOpenId(null)} />
      {add && <AddCandidateModal key={add} open job={job} existing={candidates} actorId={user.employeeId} onClose={(id) => { setAdd(null); if (id) setOpenId(id); }} />}
    </>
  );
}

export default function JobBoardView({ jobId }) {
  return <AccessGate roles={["admin", "hr", "manager"]}>{(user) => <Content user={user} jobId={jobId} />}</AccessGate>;
}
