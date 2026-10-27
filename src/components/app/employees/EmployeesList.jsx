"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowUpRight, ChevronDown, Download, FilePlus2, Network, Plus, Upload, UserX, Users, X } from "lucide-react";
import { Avatar, Badge, Button, Card, DataTable, EmptyState, PageHeader, Progress, SearchInput, Segmented, StatusBadge, Tabs, toast } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { downloadFile, toCsv } from "@/components/app/_kit/csv";
import { isActive } from "@/components/app/_kit/metrics";
import { CONTRACT_TYPES } from "@/data/constants";
import { db, useCollection, useDb } from "@/lib/db";
import { date, fullName, int } from "@/lib/format";
import { variants } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { CompletenessBadge, ContractBadge, NameCell } from "./parts";
import { EMP_STATUS, canEdit, completeness, endsWithin, scopeEmployees } from "./helpers";
import ImportModal from "./ImportModal";

const STATUS_OPTIONS = [
  { value: "actifs", label: "Tous les actifs" },
  { value: "actif", label: "Actif" },
  { value: "essai", label: "Période d'essai" },
  { value: "conge", label: "En congé" },
  { value: "sorti", label: "Sortis" },
  { value: "tous", label: "Y compris sortis" },
];

const CSV_COLUMNS = (lookups) => [
  { key: "matricule", header: "Matricule" },
  { key: "lastName", header: "Nom" },
  { key: "firstName", header: "Prénom" },
  { key: "position", header: "Poste", value: (e) => lookups.pos[e.positionId]?.title },
  { key: "dep", header: "Département", value: (e) => lookups.dep[e.departmentId]?.name },
  { key: "ent", header: "Entité", value: (e) => lookups.ent[e.entityId]?.name },
  { key: "contract", header: "Contrat", value: (e) => e.contract?.type },
  { key: "end", header: "Fin de contrat", value: (e) => e.contract?.endDate ?? "" },
  { key: "status", header: "Statut", value: (e) => EMP_STATUS[e.status]?.label ?? e.status },
  { key: "hireDate", header: "Date d'embauche", value: (e) => date(e.hireDate) },
  { key: "email", header: "Email" },
  { key: "phone", header: "Téléphone" },
  { key: "dossier", header: "Dossier complet (%)", value: (e) => completeness(e).pct },
];

/** Filter chip backed by a native <select> (keyboard + mobile friendly), styled as a pill. */
function FilterChip({ label, value, onChange, options, defaultValue = "", allLabel = "Tous" }) {
  const active = value !== defaultValue;
  const current = options.find((o) => o.value === value);
  return (
    <label
      className={cn(
        "relative inline-flex h-[2.25em] cursor-pointer items-center gap-[0.4em] rounded-md border px-[0.8em] text-[0.8125em] font-medium transition-[background-color,border-color,color] duration-150",
        "focus-within:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--ring)] hover:bg-surface-hover",
        active ? "border-pine-200 bg-primary-soft text-link" : "border-border-strong bg-surface text-fg-secondary",
      )}
    >
      <span className="max-w-[16em] truncate">
        {label}
        {active && <>: <span className="font-semibold">{current?.label}</span></>}
      </span>
      <ChevronDown className="size-[1.1em] shrink-0" aria-hidden />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0">
        {defaultValue === "" && <option value="">{allLabel}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function EmployeeCard({ employee, lookups }) {
  const c = completeness(employee);
  return (
    <Card interactive className="relative flex h-full flex-col gap-[1em] !p-[1.25em]">
      <div className="flex items-start gap-[0.9em]">
        <Avatar employee={employee} size="lg" />
        <div className="min-w-0 flex-1">
          <Link href={`/app/employees/${employee.id}`} className="block truncate font-medium text-fg after:absolute after:inset-0 after:content-[''] hover:underline">
            {fullName(employee)}
          </Link>
          <p className="truncate text-sm text-fg-secondary">{lookups.pos[employee.positionId]?.title ?? "—"}</p>
          <p className="truncate text-xs text-fg-muted">{lookups.dep[employee.departmentId]?.name} · {lookups.ent[employee.entityId]?.name}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-[0.4em]">
        <StatusBadge status={employee.status} map={EMP_STATUS} />
        <ContractBadge contract={employee.contract} />
      </div>
      <div className="mt-auto">
        <div className="mb-[0.35em] flex items-center justify-between text-xs text-fg-muted">
          <span>Dossier</span>
          <span className="num">{c.pct} %</span>
        </div>
        <Progress value={c.pct} tone={c.critical.length ? "warning" : "success"} />
      </div>
    </Card>
  );
}

function Toolbar({ children }) {
  return <div className="flex flex-wrap items-center gap-[0.6em]">{children}</div>;
}

export default function EmployeesList({ initialView = "all", initialQuery = "" }) {
  return (
    <AccessGate roles={["admin", "hr", "manager", "accountant", "employee"]}>
      {(user) => <ListBody user={user} initialView={initialView} initialQuery={initialQuery} />}
    </AccessGate>
  );
}

function ListBody({ user, initialView, initialQuery }) {
  const { role, employee: me } = user;
  const router = useRouter();
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const positions = useCollection("positions");
  const settings = useDb((s) => s.settings);
  const density = settings.density ?? "standard";

  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState("actifs");
  const [dep, setDep] = useState("");
  const [ent, setEnt] = useState("");
  const [contract, setContract] = useState("");
  const [view, setView] = useState(initialView);
  const [mode, setMode] = useState("table");
  const [importOpen, setImportOpen] = useState(false);

  const lookups = useMemo(
    () => ({
      pos: Object.fromEntries(positions.map((p) => [p.id, p])),
      dep: Object.fromEntries(departments.map((d) => [d.id, d])),
      ent: Object.fromEntries(entities.map((x) => [x.id, x])),
    }),
    [positions, departments, entities],
  );

  const scoped = useMemo(() => scopeEmployees(role, me, employees, departments), [role, me, employees, departments]);
  const editable = canEdit(role);

  const viewMatchers = useMemo(
    () => ({
      all: () => true,
      incomplete: (e) => isActive(e) && completeness(e).missing.length > 0,
      ending: (e) => endsWithin(e, 30),
      trial: (e) => e.status === "essai",
    }),
    [],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return scoped.filter((e) => {
      if (status === "actifs" ? e.status === "sorti" : status !== "tous" && e.status !== status) return false;
      if (dep && e.departmentId !== dep) return false;
      if (ent && e.entityId !== ent) return false;
      if (contract && e.contract?.type !== contract) return false;
      if (!viewMatchers[view](e)) return false;
      if (!term) return true;
      const hay = `${e.firstName} ${e.lastName} ${e.matricule} ${e.email} ${lookups.pos[e.positionId]?.title ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [scoped, q, status, dep, ent, contract, view, viewMatchers, lookups]);

  const counts = useMemo(
    () => Object.fromEntries(Object.entries(viewMatchers).map(([k, fn]) => [k, scoped.filter((e) => (k === "all" ? e.status !== "sorti" : fn(e))).length])),
    [scoped, viewMatchers],
  );

  const filtersActive = q || status !== "actifs" || dep || ent || contract || view !== "all";
  const clearAll = () => { setQ(""); setStatus("actifs"); setDep(""); setEnt(""); setContract(""); setView("all"); };

  const exportRows = (list, label) => {
    if (!list.length) return toast.warning("Aucun employé à exporter.");
    const stamp = "2026-10-27";
    downloadFile(`employes-${stamp}.csv`, toCsv(list, CSV_COLUMNS(lookups)));
    db.audit(me?.id, "Export de la liste des employés", `${list.length} ligne${list.length > 1 ? "s" : ""}`, label);
    toast.success(`${int(list.length)} employé${list.length > 1 ? "s exportés" : " exporté"} (CSV).`);
  };

  const requestDocs = (list) => {
    db.audit(me?.id, "Demande de documents envoyée", `${list.length} salarié${list.length > 1 ? "s" : ""}`, "Pièces manquantes : NIN, N° CNAS, RIB");
    toast.success(`Demande de documents envoyée à ${list.length} salarié${list.length > 1 ? "s" : ""}.`);
  };

  const bulkActions = [
    { label: "Exporter CSV", icon: Download, onClick: (list) => exportRows(list, "Sélection") },
    ...(editable ? [{ label: "Demander des documents", icon: FilePlus2, onClick: requestDocs }] : []),
  ];

  const columns = [
    { key: "name", header: "Employé", width: "19em", sortValue: (e) => `${e.lastName} ${e.firstName}`, cell: (e) => <NameCell employee={e} /> },
    {
      key: "position",
      header: "Poste & département",
      sortValue: (e) => lookups.pos[e.positionId]?.title ?? "",
      cell: (e) => (
        <span className="block min-w-0">
          <span className="block truncate text-fg">{lookups.pos[e.positionId]?.title ?? "—"}</span>
          <span className="block truncate text-xs text-fg-muted">{lookups.dep[e.departmentId]?.name}</span>
        </span>
      ),
    },
    { key: "entity", header: "Entité", sortValue: (e) => lookups.ent[e.entityId]?.name ?? "", cell: (e) => <span className="text-fg-secondary">{lookups.ent[e.entityId]?.name ?? "—"}</span> },
    { key: "contract", header: "Contrat", sortValue: (e) => e.contract?.type ?? "", cell: (e) => <ContractBadge contract={e.contract} showEnd /> },
    { key: "status", header: "Statut", sortValue: (e) => e.status, cell: (e) => <StatusBadge status={e.status} map={EMP_STATUS} /> },
    { key: "hireDate", header: "Embauche", width: "7.5em", sortValue: (e) => e.hireDate, cell: (e) => <span className="num text-fg-secondary">{date(e.hireDate)}</span> },
    { key: "dossier", header: "Dossier", sortValue: (e) => completeness(e).pct, cell: (e) => <CompletenessBadge employee={e} /> },
    {
      key: "open",
      header: "",
      width: "3.5em",
      cell: (e) => (
        <Button href={`/app/employees/${e.id}`} variant="ghost" size="icon" aria-label={`Ouvrir la fiche de ${fullName(e)}`} onClick={(ev) => ev.stopPropagation()}>
          <ArrowUpRight className="size-[1.2em]" />
        </Button>
      ),
    },
  ];

  const emptyState = scoped.length === 0 ? (
    <EmptyState
      icon={Users}
      title={role === "manager" ? "Aucun collaborateur dans votre équipe" : "Aucun employé pour le moment"}
      description={role === "manager" ? "Les employés dont vous êtes le responsable direct apparaîtront ici." : "Importez un fichier Excel ou ajoutez le premier employé pour commencer."}
      action={editable ? <Button href="/app/employees/new" icon={Plus}>Ajouter un employé</Button> : undefined}
      secondary={editable ? <Button variant="ghost" icon={Upload} onClick={() => setImportOpen(true)}>Importer</Button> : undefined}
    />
  ) : (
    <EmptyState
      icon={UserX}
      title="Aucun employé ne correspond"
      description="Aucun dossier ne répond à ces critères. Élargissez la recherche ou retirez un filtre."
      action={<Button variant="secondary" icon={X} onClick={clearAll}>Effacer les filtres</Button>}
    />
  );

  const tabs = [
    { value: "all", label: "Tous", count: counts.all },
    { value: "incomplete", label: "Dossiers incomplets", count: counts.incomplete },
    { value: "ending", label: "Fin de contrat sous 30 j", count: counts.ending },
    { value: "trial", label: "En essai", count: counts.trial },
  ];

  return (
    <motion.div variants={variants.container} initial="hidden" animate="show">
      <PageHeader
        title={role === "manager" ? "Mon équipe" : "Employés"}
        description={
          role === "manager"
            ? `${int(scoped.length)} collaborateur${scoped.length > 1 ? "s" : ""} sous votre responsabilité. Les salaires ne sont pas visibles pour les managers.`
            : `${int(counts.all)} salariés actifs · ${int(counts.incomplete)} dossier${counts.incomplete > 1 ? "s" : ""} à compléter`
        }
        actions={
          <>
            <Button variant="ghost" icon={Network} href="/app/org-chart">Organigramme</Button>
            {editable && <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Importer</Button>}
            <Button variant="secondary" icon={Download} onClick={() => exportRows(rows, "Liste filtrée")}>Exporter</Button>
            {editable && <Button icon={Plus} href="/app/employees/new">Ajouter un employé</Button>}
          </>
        }
      />

      <motion.div variants={variants.rise} className="flex flex-col gap-[1em]">
        <Tabs tabs={tabs} value={view} onChange={setView} />

        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Rechercher un nom, un matricule, un poste…" className="w-full sm:w-[22em]" />
          <FilterChip label="Statut" value={status} onChange={setStatus} options={STATUS_OPTIONS} defaultValue="actifs" />
          <FilterChip label="Département" value={dep} onChange={setDep} options={departments.map((d) => ({ value: d.id, label: d.name }))} allLabel="Tous les départements" />
          <FilterChip label="Entité" value={ent} onChange={setEnt} options={entities.map((x) => ({ value: x.id, label: x.name }))} allLabel="Toutes les entités" />
          <FilterChip label="Contrat" value={contract} onChange={setContract} options={Object.entries(CONTRACT_TYPES).map(([value, label]) => ({ value, label }))} allLabel="Tous les contrats" />
          {filtersActive && <Button variant="ghost" size="sm" icon={X} onClick={clearAll}>Tout effacer</Button>}
          <div className="ms-auto flex items-center gap-[0.6em]">
            {mode === "table" && (
              <Segmented
                size="sm"
                value={density}
                onChange={(d) => db.patchSettings({ density: d })}
                options={[{ value: "comfortable", label: "Aéré" }, { value: "standard", label: "Standard" }, { value: "compact", label: "Compact" }]}
                className="hidden md:inline-flex"
              />
            )}
            <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: "table", label: "Tableau" }, { value: "cards", label: "Cartes" }]} />
          </div>
        </Toolbar>

        <p className="text-sm text-fg-muted" aria-live="polite">
          {int(rows.length)} résultat{rows.length > 1 ? "s" : ""}
          {filtersActive ? " · filtres appliqués" : ""} · tri par défaut : ordre du dossier
        </p>

        {mode === "table" ? (
          <>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                rows={rows}
                selectable
                bulkActions={bulkActions}
                density={density}
                pageSize={15}
                empty={emptyState}
                onRowClick={(e) => router.push(`/app/employees/${e.id}`)}
              />
            </div>
            <CardGrid rows={rows} lookups={lookups} empty={emptyState} className="md:hidden" />
          </>
        ) : (
          <CardGrid rows={rows} lookups={lookups} empty={emptyState} />
        )}
      </motion.div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </motion.div>
  );
}

function CardGrid({ rows, lookups, empty, className }) {
  const [limit, setLimit] = useState(24);
  if (!rows.length) return <div className={cn("rounded-lg border border-border bg-surface", className)}>{empty}</div>;
  return (
    <div className={className}>
      <ul className="grid gap-[1em] sm:grid-cols-2 xl:grid-cols-3">
        {rows.slice(0, limit).map((e) => (
          <li key={e.id}><EmployeeCard employee={e} lookups={lookups} /></li>
        ))}
      </ul>
      {rows.length > limit && (
        <div className="mt-[1.25em] flex justify-center">
          <Button variant="secondary" onClick={() => setLimit((l) => l + 24)}>Afficher plus ({int(rows.length - limit)})</Button>
        </div>
      )}
    </div>
  );
}
