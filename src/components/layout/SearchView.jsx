"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, FileText, MessageSquarePlus, SearchX, Search as SearchIcon } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, PageHeader, SearchInput, StatusBadge, Tabs } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useCollection } from "@/lib/db";
import { navGroups } from "@/content/nav";
import { fuzzyScore, findEmployees } from "@/lib/commands";
import { date as fmtDate, fullName } from "@/lib/format";
import { LEAVE_STATUS, LEAVE_TYPES, REQUEST_KINDS } from "@/data/constants";
import { useCurrentUser } from "@/lib/use-current-user";

const REQUEST_STATUS = { pending: { label: "En attente", tone: "warning" }, approved: { label: "Approuvée", tone: "success" }, rejected: { label: "Refusée", tone: "danger" } };
const EXAMPLES = ["Sofiane", "attestation", "contrat", "septembre", "Production"];

function Row({ href, lead, title, detail, trailing }) {
  return (
    <Link href={href} className="flex items-center gap-[0.8em] px-[1.1em] py-[0.7em] transition-colors duration-150 hover:bg-surface-hover">
      {lead}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-fg">{title}</span>
        <span className="block truncate text-sm text-fg-muted">{detail}</span>
      </span>
      {trailing}
    </Link>
  );
}

function Section({ title, count, children }) {
  if (!count) return null;
  return (
    <section aria-label={title} className="mb-[1.5em]">
      <h2 className="mb-[0.6em] flex items-center gap-[0.5em] font-sans text-h3 font-semibold text-fg">
        {title}
        <Badge tone="neutral" dot={false}>{count}</Badge>
      </h2>
      <Card padded={false}><ul className="divide-y divide-border-subtle">{children}</ul></Card>
    </section>
  );
}

const ICON_TILE = "flex size-[2.25em] shrink-0 items-center justify-center rounded-md bg-bg-sunken text-fg-secondary";

export default function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { role, employeeId } = useCurrentUser();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [tab, setTab] = useState("all");
  const employees = useCollection("employees");
  const positions = useCollection("positions");
  const documents = useCollection("documents");
  const requests = useCollection("requests");
  const leave = useCollection("leaveRequests");

  const onChange = (v) => {
    setQ(v);
    router.replace(v.trim() ? `${pathname}?q=${encodeURIComponent(v)}` : pathname, { scroll: false });
  };

  const byId = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) return null;
    const staff = ["admin", "hr", "manager", "accountant"].includes(role);
    const team = new Set(employees.filter((e) => e.managerId === employeeId).map((e) => e.id));
    const visibleEmp = (id) => role === "admin" || role === "hr" || role === "accountant" || id === employeeId || (role === "manager" && team.has(id));

    const people = staff
      ? findEmployees(query, employees, positions).filter((r) => r.score >= 30).slice(0, 12).map((r) => r.employee)
      : employees.filter((e) => e.id === employeeId && fuzzyScore(query, fullName(e)) > 0);

    const docs = documents
      .filter((d) => staff || d.ownerId === employeeId || d.folder === "Entreprise" || d.folder === "Modèles")
      .map((d) => ({ d, s: Math.max(fuzzyScore(query, d.name), fuzzyScore(query, d.folder) * 0.6, fuzzyScore(query, fullName(byId[d.ownerId])) * 0.5) }))
      .filter((x) => x.s >= 30)
      .sort((a, b) => b.s - a.s)
      .slice(0, 10)
      .map((x) => x.d);

    const reqs = [
      ...requests.filter((r) => visibleEmp(r.employeeId)).map((r) => ({
        key: r.id, kind: "request", href: "/app/requests", employee: byId[r.employeeId], title: REQUEST_KINDS[r.kind] ?? r.kind, detail: `${fullName(byId[r.employeeId])} · ${fmtDate(r.createdAt)}${r.note ? ` · ${r.note}` : ""}`, status: <StatusBadge status={r.status} map={REQUEST_STATUS} />,
        text: `${REQUEST_KINDS[r.kind] ?? ""} ${fullName(byId[r.employeeId])} ${r.note ?? ""} ${REQUEST_STATUS[r.status]?.label ?? ""}`,
      })),
      ...leave.filter((l) => visibleEmp(l.employeeId)).map((l) => ({
        key: l.id, kind: "leave", href: "/app/leave/requests", employee: byId[l.employeeId], title: `${LEAVE_TYPES[l.type]?.label ?? "Congé"} · ${l.days} j`, detail: `${fullName(byId[l.employeeId])} · ${fmtDate(l.from)} → ${fmtDate(l.to)}${l.reason ? ` · ${l.reason}` : ""}`, status: <StatusBadge status={l.status} map={LEAVE_STATUS} />,
        text: `conge ${LEAVE_TYPES[l.type]?.label ?? ""} ${fullName(byId[l.employeeId])} ${l.reason ?? ""} ${LEAVE_STATUS[l.status]?.label ?? ""}`,
      })),
    ]
      .map((r) => ({ r, s: fuzzyScore(query, r.text) }))
      .filter((x) => x.s >= 30)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.r);

    const pages = navGroups
      .flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })))
      .filter((i) => i.roles.includes(role))
      .map((i) => ({ i, s: Math.max(fuzzyScore(query, i.label), fuzzyScore(query, i.group) * 0.5) }))
      .filter((x) => x.s >= 30)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.i);

    return { people, docs, reqs, pages };
  }, [q, role, employeeId, employees, positions, documents, requests, leave, byId]);

  const total = results ? results.people.length + results.docs.length + results.reqs.length + results.pages.length : 0;
  const show = (k) => tab === "all" || tab === k;
  const posTitle = (e) => positions.find((p) => p.id === e.positionId)?.title ?? "";

  return (
    <>
      <PageHeader eyebrow="Recherche" title={q.trim() ? `Résultats pour « ${q.trim()} »` : "Rechercher dans SIRH"} description="Employés, documents, demandes et pages, selon vos droits." />
      <SearchInput className="mb-[1.25em] max-w-[34em]" placeholder="Nom, matricule, document, demande…" value={q} onChange={onChange} autoFocus />

      {!results ? (
        <Card>
          <EmptyState
            icon={SearchIcon}
            title="Que cherchez-vous ?"
            description="Tapez un nom, un matricule, un type de demande ou le nom d'un document. Astuce : ⌘K ouvre la palette de commandes depuis n'importe où."
            action={
              <div className="flex flex-wrap justify-center gap-[0.4em]">
                {EXAMPLES.map((x) => (
                  <Link key={x} href={`/app/search?q=${encodeURIComponent(x)}`} onClick={() => setQ(x)} className="rounded-full border border-border bg-surface px-[0.9em] py-[0.3em] text-sm text-fg-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-fg">
                    {x}
                  </Link>
                ))}
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <Tabs
            className="mb-[1.25em]"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "all", label: "Tout", count: total },
              { value: "people", label: "Employés", count: results.people.length },
              { value: "docs", label: "Documents", count: results.docs.length },
              { value: "reqs", label: "Demandes", count: results.reqs.length },
              { value: "pages", label: "Pages", count: results.pages.length },
            ]}
          />
          {total === 0 && (
            <Card>
              <EmptyState icon={SearchX} title="Aucun résultat" description={`Rien ne correspond à « ${q.trim()} ». Vérifiez l'orthographe ou essayez un prénom, un matricule ou « attestation ».`} secondary={null} />
            </Card>
          )}
          {show("people") && (
            <Section title="Employés" count={results.people.length}>
              {results.people.map((e) => (
                <li key={e.id}>
                  <Row href={`/app/employees/${e.id}`} lead={<Avatar employee={e} size="sm" />} title={fullName(e)} detail={`${e.matricule} · ${posTitle(e)}`} trailing={e.status === "sorti" ? <Badge tone="neutral">Sorti</Badge> : null} />
                </li>
              ))}
            </Section>
          )}
          {show("docs") && (
            <Section title="Documents" count={results.docs.length}>
              {results.docs.map((d) => (
                <li key={d.id}>
                  <Row href={`/app/documents?q=${encodeURIComponent(d.name)}`} lead={<span className={ICON_TILE}><FileText className="size-[1.1em]" aria-hidden strokeWidth={1.7} /></span>} title={d.name} detail={`${d.folder} · ajouté le ${fmtDate(d.uploadedAt)}`} trailing={d.expiresAt ? <Badge tone="warning">Expire le {fmtDate(d.expiresAt)}</Badge> : null} />
                </li>
              ))}
            </Section>
          )}
          {show("reqs") && (
            <Section title="Demandes" count={results.reqs.length}>
              {results.reqs.map((r) => (
                <li key={r.key}>
                  <Row href={r.href} lead={<span className={cn(ICON_TILE)}>{r.kind === "leave" ? <CalendarDays className="size-[1.1em]" aria-hidden strokeWidth={1.7} /> : <MessageSquarePlus className="size-[1.1em]" aria-hidden strokeWidth={1.7} />}</span>} title={r.title} detail={r.detail} trailing={r.status} />
                </li>
              ))}
            </Section>
          )}
          {show("pages") && (
            <Section title="Pages" count={results.pages.length}>
              {results.pages.map((p) => (
                <li key={p.href}>
                  <Row href={p.href} lead={<span className={ICON_TILE}><p.icon className="size-[1.1em]" aria-hidden strokeWidth={1.7} /></span>} title={p.label} detail={p.group} />
                </li>
              ))}
            </Section>
          )}
        </>
      )}
    </>
  );
}
