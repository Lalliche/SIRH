"use client";

import { useMemo, useState } from "react";
import { Check, FilePlus2, FileText, Inbox, X } from "lucide-react";
import { Badge, Button, Card, DataTable, EmptyState, PageHeader, PersonCell, SearchInput, Segmented, StatusBadge } from "@/components/ui";
import { PageSkeleton } from "@/components/app/_kit/Skeleton";
import { useDecisions } from "@/components/app/inbox/use-decisions";
import ReasonModal from "@/components/app/leave/ReasonModal";
import { useDirectory } from "@/components/app/leave/use-directory";
import { REQUEST_KINDS } from "@/data/constants";
import { useCollection } from "@/lib/db";
import { date, fullName } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import DocumentPreviewModal from "./DocumentPreviewModal";
import NewRequestModal from "./NewRequestModal";
import { REQUEST_META, REQUEST_STATUS, isDoc, requestDetails, slaOf } from "./requests-utils";

export default function RequestsCenter() {
  const me = useCurrentUser();
  const dir = useDirectory();
  const requests = useCollection("requests");
  const decide = useDecisions();

  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null); // kind | "" | null
  const [rejecting, setRejecting] = useState(null);
  const [previewId, setPreviewId] = useState(null);

  const isHr = me.role === "admin" || me.role === "hr";
  const mine = useMemo(() => requests.filter((r) => isHr || r.employeeId === me.employeeId).map((r) => ({ ...r, employee: dir.byId[r.employeeId] })), [requests, isHr, me.employeeId, dir.byId]);
  const counts = useMemo(() => Object.fromEntries(["all", "pending", "approved", "rejected"].map((t) => [t, t === "all" ? mine.length : mine.filter((r) => r.status === t).length])), [mine]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return mine
      .filter((r) => tab === "all" || r.status === tab)
      .filter((r) => !term || (REQUEST_KINDS[r.kind] + " " + r.note + " " + fullName(r.employee)).toLowerCase().includes(term));
  }, [mine, tab, q]);

  if (!me.ready) return <PageSkeleton cards={0} />;

  const approve = (r) => {
    const res = decide([{ kind: "request", id: r.id }], "approve");
    if (res && isDoc(r.kind)) setPreviewId(r.id);
  };

  const columns = [
    {
      key: "kind", header: "Demande", sortValue: (r) => REQUEST_KINDS[r.kind],
      cell: (r) => {
        const Icon = REQUEST_META[r.kind]?.icon ?? FileText;
        const det = requestDetails(r).filter(([k]) => k !== "Référence").map(([, v]) => v).join(" · ");
        return (
          <span className="flex min-w-0 items-center gap-[0.75em]">
            <span aria-hidden className="flex size-[2em] shrink-0 items-center justify-center rounded-md bg-primary-soft text-pine-600"><Icon className="size-[1.1em]" strokeWidth={1.6} /></span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg">{REQUEST_KINDS[r.kind]}{det && <span className="font-normal text-fg-secondary"> · {det}</span>}</span>
              <span className="block truncate text-xs text-fg-muted">{r.note || "Sans précision"}</span>
            </span>
          </span>
        );
      },
    },
    ...(isHr ? [{ key: "employee", header: "Employé", sortValue: (r) => fullName(r.employee), cell: (r) => <PersonCell employee={r.employee} sub={dir.department(r.employee)} /> }] : []),
    { key: "createdAt", header: "Reçue le", width: "8em", cell: (r) => <span className="num">{date(r.createdAt)}</span> },
    {
      key: "sla", header: "Délai", sortValue: (r) => slaOf(r).age,
      cell: (r) => {
        if (r.status !== "pending") return <span className="text-xs text-fg-muted">{r.decidedAt ? `Traitée le ${date(r.decidedAt)}` : "—"}</span>;
        const s = slaOf(r);
        return s.late ? <Badge tone="danger">En retard de {s.age - s.sla} j</Badge> : <Badge tone="neutral">{s.left > 0 ? `Sous ${s.left} j` : "Aujourd'hui"}</Badge>;
      },
    },
    { key: "status", header: "Statut", sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} map={REQUEST_STATUS} /> },
    {
      key: "actions", header: "", sortable: false, align: "end",
      cell: (r) => (
        <span className="inline-flex gap-[0.3em]">
          {isHr && r.status === "pending" && (
            <>
              <Button size="sm" variant="soft" icon={Check} onClick={() => approve(r)}>Approuver</Button>
              <Button size="icon" variant="danger" aria-label={`Refuser la demande de ${fullName(r.employee)}`} onClick={() => setRejecting(r)}><X className="size-[1.2em]" /></Button>
            </>
          )}
          {r.status === "approved" && isDoc(r.kind) && <Button size="sm" variant="secondary" icon={FileText} onClick={() => setPreviewId(r.id)}>Voir le document</Button>}
          {r.status === "rejected" && r.rejectReason && <span className="max-w-[16em] truncate text-xs text-fg-muted" title={r.rejectReason}>Motif : {r.rejectReason}</span>}
        </span>
      ),
    },
  ];

  const clear = () => { setTab("all"); setQ(""); };

  return (
    <>
      <PageHeader
        title="Demandes"
        description={isHr ? "Toutes les demandes des salariés : attestations, avances, changements d'informations et matériel." : "Attestations, avance, changement d'informations, matériel : une demande, une réponse sous quelques jours."}
        actions={<Button icon={FilePlus2} onClick={() => setModal("")}>Nouvelle demande</Button>}
      />

      <ul className="mb-[1.25em] grid grid-cols-2 gap-[0.6em] md:grid-cols-3 xl:grid-cols-6" aria-label="Demandes fréquentes">
        {Object.entries(REQUEST_META).map(([k, m]) => {
          const Icon = m.icon;
          return (
            <li key={k}>
              <Button variant="secondary" className="!h-auto w-full flex-col items-start gap-[0.4em] whitespace-normal !py-[0.8em] text-start" onClick={() => setModal(k)}>
                <Icon className="size-[1.3em] text-pine-600" aria-hidden strokeWidth={1.5} />
                <span className="font-medium">{REQUEST_KINDS[k]}</span>
                <span className="text-[0.85em] font-normal text-fg-muted">Délai : {m.sla} j</span>
              </Button>
            </li>
          );
        })}
      </ul>

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
        <SearchInput className="w-[16em]" placeholder="Rechercher une demande…" value={q} onChange={setQ} />
        {(tab !== "all" || q) && <Button variant="ghost" size="sm" onClick={clear}>Tout effacer</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        density="comfortable"
        pageSize={10}
        defaultSort={{ key: "createdAt", dir: "desc" }}
        empty={
          tab !== "all" || q ? (
            <EmptyState icon={Inbox} title="Aucune demande ne correspond" description="Modifiez la recherche ou changez d'onglet." action={<Button variant="secondary" onClick={clear}>Effacer les filtres</Button>} />
          ) : (
            <EmptyState icon={Inbox} title="Aucune demande pour le moment" description={isHr ? "Les demandes des salariés apparaîtront ici." : "Besoin d'une attestation de travail ? Faites votre demande en deux clics."} action={<Button icon={FilePlus2} onClick={() => setModal("")}>Nouvelle demande</Button>} />
          )
        }
      />

      <NewRequestModal open={modal !== null} onClose={() => setModal(null)} initialKind={modal || "attestation_travail"} />
      <ReasonModal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        description={rejecting ? `${fullName(rejecting.employee)} · ${REQUEST_KINDS[rejecting.kind]}` : undefined}
        onConfirm={(reason) => { decide([{ kind: "request", id: rejecting.id }], "reject", reason); setRejecting(null); }}
      />
      <DocumentPreviewModal request={previewId ? requests.find((r) => r.id === previewId) : null} onClose={() => setPreviewId(null)} />
    </>
  );
}
