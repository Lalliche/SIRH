"use client";

import { useMemo } from "react";
import { AlertTriangle, FileText, History, Wallet } from "lucide-react";
import { Badge, Progress, StatusBadge } from "@/components/ui";
import EmployeeBrief from "@/components/app/leave/EmployeeBrief";
import { IssueList } from "@/components/app/leave/LeaveContext";
import { useDirectory } from "@/components/app/leave/use-directory";
import { LOAN_STATUS, LOAN_TYPES, capacity, lastInstallment, monthsFor } from "@/components/app/loans/loan-utils";
import { REQUEST_STATUS, isDoc, requestDetails } from "@/components/app/requests/requests-utils";
import { REQUEST_KINDS } from "@/data/constants";
import { useCollection } from "@/lib/db";
import { date, dateLong, dateShort, money } from "@/lib/format";
import { periodLabel } from "@/lib/format";
import { can } from "@/lib/session";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import { ageLabel } from "./inbox-items";

function Section({ icon: Icon, title, children }) {
  return (
    <section className="border-t border-border-subtle pt-[1em]">
      <h4 className="mb-[0.6em] flex items-center gap-[0.5em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
        <Icon className="size-[1.2em]" aria-hidden strokeWidth={1.75} />{title}
      </h4>
      {children}
    </section>
  );
}

const Row = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-[1em] py-[0.25em] text-sm">
    <dt className="text-fg-muted">{label}</dt>
    <dd className="text-end font-medium text-fg num">{children}</dd>
  </div>
);

export function LoanContext({ item }) {
  const me = useCurrentUser();
  const dir = useDirectory();
  const loans = useCollection("loans");
  const l = item.raw;
  const emp = item.employee;
  const money0 = (v) => money(v, { decimals: 0 });
  const cap = useMemo(() => capacity(emp, loans, l.monthly, l.id), [emp, loans, l]);
  const salaries = can(me.role, "salaries");
  const others = loans.filter((x) => x.employeeId === l.employeeId && x.id !== l.id);
  const n = monthsFor(l.total, l.monthly);

  return (
    <div className="flex flex-col gap-[1em]">
      <EmployeeBrief employee={emp} position={dir.position(emp)} department={dir.department(emp)} />
      <dl className="rounded-md bg-surface-2 px-[0.9em] py-[0.6em]">
        <Row label="Type">{LOAN_TYPES[l.type]?.label}</Row>
        <Row label="Montant">{money0(l.total)}</Row>
        <Row label="Mensualité">{money0(l.monthly)} × {n} mois</Row>
        <Row label="Dernière mensualité">{money0(lastInstallment(l.total, l.monthly))}</Row>
        <Row label="Première retenue">{periodLabel(l.startDate.slice(0, 7))}</Row>
      </dl>
      {l.reason && <p className="text-sm text-fg-secondary">« {l.reason} »</p>}
      <IssueList issues={item.issues} />
      <Section icon={Wallet} title="Capacité de remboursement">
        {salaries ? (
          <>
            <Progress value={cap.total} max={cap.cap} tone={cap.ok ? "primary" : "danger"} />
            <p className="mt-[0.5em] text-sm text-fg-secondary">
              Retenues cumulées <strong className="font-medium text-fg num">{money0(cap.total)}</strong> pour un plafond d’un tiers du net de <strong className="font-medium text-fg num">{money0(cap.cap)}</strong> (net {money0(cap.net)}).
            </p>
          </>
        ) : (
          <p className="text-sm text-fg-secondary">{cap.ok ? "La mensualité respecte la règle du tiers du net." : "La mensualité dépasse la règle du tiers du net."} <span className="text-fg-muted">Montants masqués pour votre rôle.</span></p>
        )}
      </Section>
      <Section icon={History} title="Autres prêts du salarié">
        {others.length === 0 ? <p className="text-sm text-fg-secondary">Aucun prêt ni avance précédent.</p> : (
          <ul className="flex flex-col gap-[0.45em]">
            {others.map((x) => (
              <li key={x.id} className="flex items-center gap-[0.6em] text-sm">
                <span className="min-w-0 flex-1 truncate text-fg-secondary">{LOAN_TYPES[x.type]?.short} · {money0(x.total)}</span>
                <span className="num text-xs text-fg-muted">reste {money0(x.remaining)}</span>
                <StatusBadge status={x.status} map={LOAN_STATUS} dot={false} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export function RequestContext({ item }) {
  const dir = useDirectory();
  const requests = useCollection("requests");
  const r = item.raw;
  const emp = item.employee;
  const details = requestDetails(r);
  const history = requests.filter((x) => x.employeeId === r.employeeId && x.id !== r.id).slice(0, 4);
  return (
    <div className="flex flex-col gap-[1em]">
      <EmployeeBrief employee={emp} position={dir.position(emp)} department={dir.department(emp)} />
      <div className="rounded-md bg-surface-2 px-[0.9em] py-[0.7em]">
        <p className="font-medium text-fg">{REQUEST_KINDS[r.kind]}</p>
        <p className="text-sm text-fg-secondary">{r.note || "Aucune précision fournie."}</p>
        <p className="mt-[0.3em] text-xs text-fg-muted">Reçue le {date(r.createdAt)} · {ageLabel(r.createdAt).toLowerCase()}</p>
      </div>
      {details.length > 0 && <dl className="px-[0.2em]">{details.map(([k, v]) => <Row key={k} label={k}>{v}</Row>)}</dl>}
      <IssueList issues={item.issues} />
      {isDoc(r.kind) && (
        <p className="flex items-start gap-[0.5em] rounded-md bg-primary-soft px-[0.9em] py-[0.6em] text-sm text-fg-secondary">
          <FileText className="mt-[0.15em] size-[1.1em] shrink-0 text-pine-600" aria-hidden />
          À l’approbation, le document est généré avec l’en-tête de l’entreprise, prêt à signer et imprimer (page Demandes).
        </p>
      )}
      {r.kind === "avance" && r.amount > 0 && (
        <p className="rounded-md bg-primary-soft px-[0.9em] py-[0.6em] text-sm text-fg-secondary">À l’approbation, un échéancier de retenues est créé automatiquement dans Prêts & avances.</p>
      )}
      <Section icon={History} title="Demandes précédentes">
        {history.length === 0 ? <p className="text-sm text-fg-secondary">Première demande de ce salarié.</p> : (
          <ul className="flex flex-col gap-[0.45em]">
            {history.map((x) => (
              <li key={x.id} className="flex items-center gap-[0.6em] text-sm">
                <span className="min-w-0 flex-1 truncate text-fg-secondary">{REQUEST_KINDS[x.kind]}</span>
                <span className="num text-xs text-fg-muted">{dateShort(x.createdAt)}</span>
                <StatusBadge status={x.status} map={REQUEST_STATUS} dot={false} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

const Cell = ({ v, changed }) => <span className={cn("num rounded-sm px-[0.4em] py-[0.1em]", changed && "bg-warning-bg font-semibold text-warning-fg")}>{v ?? "—"}</span>;

export function CorrectionContext({ item }) {
  const dir = useDirectory();
  const a = item.raw;
  const c = a.correction;
  return (
    <div className="flex flex-col gap-[1em]">
      <EmployeeBrief employee={item.employee} position={dir.position(item.employee)} department={dir.department(item.employee)} />
      <div className="rounded-md bg-surface-2 px-[0.9em] py-[0.7em]">
        <p className="font-medium capitalize text-fg">{dateLong(a.date)}</p>
        <table className="mt-[0.5em] w-full text-sm">
          <thead><tr className="text-xs text-fg-muted"><th className="text-start font-medium" /><th className="text-start font-medium">Entrée</th><th className="text-start font-medium">Sortie</th></tr></thead>
          <tbody>
            <tr><td className="py-[0.25em] text-fg-muted">Enregistré</td><td><Cell v={a.in} /></td><td><Cell v={a.out} /></td></tr>
            <tr><td className="py-[0.25em] text-fg-muted">Demandé</td><td><Cell v={c.in} changed={c.in !== a.in} /></td><td><Cell v={c.out} changed={c.out !== a.out} /></td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-fg-secondary">« {c.reason} »</p>
      <p className="flex items-center gap-[0.5em] text-xs text-fg-muted">
        <AlertTriangle className="size-[1.1em]" aria-hidden /> Statut actuel : <Badge tone={a.status === "absent" ? "danger" : "neutral"}>{a.status === "absent" ? "Absent" : a.status === "late" ? "Retard" : "Présent"}</Badge>
      </p>
      <p className="text-xs text-fg-muted">La modification est conservée dans le journal d’audit avec le motif.</p>
    </div>
  );
}
