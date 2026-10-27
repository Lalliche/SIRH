"use client";

import { useMemo, useState } from "react";
import { Download, Eye, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, DataTable, EmptyState, PersonCell, SearchInput, Segmented, SelectInput } from "@/components/ui";

import { db, useCollection } from "@/lib/db";
import { downloadCsv } from "@/components/app/_kit/csv";
import { date, fullName } from "@/lib/format";
import Section from "./Section";

const isSalary = (a) => /salaire/i.test(a.action);
const time = (at) => at.slice(11, 16);

export default function AuditLog({ user }) {
  const audit = useCollection("audit");
  const employees = useCollection("employees");
  const [q, setQ] = useState("");
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [view, setView] = useState("all");

  const byId = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const actors = useMemo(() => [...new Set(audit.map((a) => a.actorId))].filter((id) => byId[id]).map((id) => ({ value: id, label: fullName(byId[id]) })), [audit, byId]);
  const actions = useMemo(() => [...new Set(audit.map((a) => a.action))].sort(), [audit]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return audit
      .filter((a) => view === "all" || isSalary(a))
      .filter((a) => !actor || a.actorId === actor)
      .filter((a) => !action || a.action === action)
      .filter((a) => !needle || `${a.action} ${a.target} ${a.detail}`.toLowerCase().includes(needle))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [audit, q, actor, action, view]);

  const salaryViews = useMemo(() => {
    const m = new Map();
    audit.filter(isSalary).forEach((a) => m.set(a.actorId, (m.get(a.actorId) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [audit]);

  const exportCsv = () => {
    db.audit(user.employeeId, "Journal d'audit exporté", "Journal d'audit", `${rows.length} lignes`);
    downloadCsv("journal-audit.csv", rows, [
      { key: "at", header: "Date et heure", value: (r) => r.at.replace("T", " ") },
      { key: "actor", header: "Acteur", value: (r) => fullName(byId[r.actorId]) },
      { key: "action", header: "Action" }, { key: "target", header: "Cible" }, { key: "detail", header: "Détail" },
    ]);
  };

  const columns = [
    { key: "at", header: "Date", className: "whitespace-nowrap", cell: (r) => <span className="num">{date(r.at)} <span className="text-fg-muted">{time(r.at)}</span></span> },
    { key: "actor", header: "Acteur", sortValue: (r) => byId[r.actorId]?.lastName ?? "", cell: (r) => <PersonCell employee={byId[r.actorId]} /> },
    { key: "action", header: "Action", cell: (r) => (isSalary(r) ? <Badge tone="warning" icon={Eye}>{r.action}</Badge> : <span className="font-medium text-fg">{r.action}</span>) },
    { key: "target", header: "Cible" },
    { key: "detail", header: "Détail", className: "text-fg-secondary" },
  ];

  return (
    <div className="flex flex-col gap-[1.25em]">
      <Section title="Qui a consulté les salaires ?" description="Chaque consultation de salaire, génération d'attestation de salaire ou export est enregistrée, sans exception.">
        {salaryViews.length === 0 ? (
          <p className="flex items-center gap-[0.6em] text-sm text-fg-secondary"><ShieldCheck className="size-[1.2em] text-success-fg" aria-hidden />Aucune consultation de salaire enregistrée.</p>
        ) : (
          <ul className="flex flex-wrap gap-[0.8em]">
            {salaryViews.map(([id, n]) => (
              <li key={id}>
                <Card className="flex items-center gap-[0.9em] !p-[0.8em]"><PersonCell employee={byId[id]} size="md" /><Badge tone="warning" dot={false}>{n} consultation{n > 1 ? "s" : ""}</Badge></Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div>
        <div className="mb-[1em] flex flex-wrap items-center gap-[0.7em]">
          <SearchInput className="w-full sm:w-[16em]" placeholder="Rechercher dans le journal…" value={q} onChange={setQ} />
          <SelectInput aria-label="Acteur" className="w-[14em]" value={actor} onChange={setActor} placeholder="Tous les acteurs" options={actors} />
          <SelectInput aria-label="Action" className="w-[15em]" value={action} onChange={setAction} placeholder="Toutes les actions" options={actions} />
          <Segmented value={view} onChange={setView} options={[{ value: "all", label: "Tout" }, { value: "salary", label: "Salaires" }]} />
          <Button className="ms-auto" variant="secondary" icon={Download} onClick={exportCsv}>Exporter en CSV</Button>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          pageSize={12}
          empty={<EmptyState icon={ShieldCheck} title="Aucune entrée" description="Aucune action ne correspond à ces filtres." action={<Button variant="secondary" onClick={() => { setQ(""); setActor(""); setAction(""); setView("all"); }}>Effacer les filtres</Button>} />}
        />
      </div>
    </div>
  );
}
