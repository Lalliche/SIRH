"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarOff, CheckCircle2, History, Info, Users } from "lucide-react";
import { Avatar, Badge, StatusBadge } from "@/components/ui";
import { LEAVE_STATUS } from "@/data/constants";
import { useCollection, useDb } from "@/lib/db";
import { date, dateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import EmployeeBrief from "./EmployeeBrief";
import LeaveTypeTag from "./LeaveTypeTag";
import { CONFLICT_RATE, analyzeLeave, fmtDays } from "./leave-utils";
import { useDirectory } from "./use-directory";

export function useLeaveAnalysis(params) {
  const employees = useCollection("employees");
  const leaveRequests = useCollection("leaveRequests");
  const settings = useDb((s) => s.settings);
  const { employeeId, type, from, to, excludeId } = params;
  return useMemo(
    () => analyzeLeave({ employees, leaveRequests, settings }, { employeeId, type, from, to, excludeId }),
    [employees, leaveRequests, settings, employeeId, type, from, to, excludeId],
  );
}

function Section({ icon: Icon, title, children, className }) {
  return (
    <section className={cn("border-t border-border-subtle pt-[1em]", className)}>
      <h4 className="mb-[0.6em] flex items-center gap-[0.5em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
        <Icon className="size-[1.2em]" aria-hidden strokeWidth={1.75} />
        {title}
      </h4>
      {children}
    </section>
  );
}

export function IssueList({ issues }) {
  if (!issues.length) {
    return (
      <p className="flex items-center gap-[0.5em] rounded-md bg-success-bg px-[0.8em] py-[0.55em] text-sm text-success-fg">
        <CheckCircle2 className="size-[1.2em] shrink-0" aria-hidden /> Aucun conflit détecté : demande sûre.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-[0.4em]">
      {issues.map((i) => (
        <li key={i.text} className={cn("flex items-start gap-[0.5em] rounded-md px-[0.8em] py-[0.55em] text-sm", i.tone === "danger" ? "bg-danger-bg text-danger-fg" : i.tone === "warning" ? "bg-warning-bg text-warning-fg" : "bg-info-bg text-info-fg")}>
          {i.tone === "info" ? <Info className="mt-[0.15em] size-[1.1em] shrink-0" aria-hidden /> : <AlertTriangle className="mt-[0.15em] size-[1.1em] shrink-0" aria-hidden />}
          <span>{i.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function BalanceImpact({ before, after, consumes }) {
  const neg = after < 0;
  return (
    <div>
      <div className="flex items-baseline gap-[0.6em]">
        <span className="font-display text-h2 font-semibold text-fg num">{fmtDays(before)}</span>
        <span className="text-fg-muted" aria-hidden>→</span>
        <span className={cn("font-display text-h2 font-semibold num", neg ? "text-danger-fg" : "text-fg")}>{fmtDays(after)}</span>
        <span className="text-xs text-fg-muted">{consumes ? "solde de congé annuel" : "sans effet sur le solde annuel"}</span>
      </div>
    </div>
  );
}

/** Context card: balance before/after, who else is out, holidays, history. Used in the inbox and request drawers. */
export default function LeaveContext({ request, showEmployee = true }) {
  const a = useLeaveAnalysis({ employeeId: request.employeeId, type: request.type, from: request.from, to: request.to, excludeId: request.id });
  const dir = useDirectory();
  if (!a) return null;
  const { emp, count } = a;
  const names = (reqs) => reqs.map((r) => ({ r, e: dir.byId[r.employeeId] })).filter((x) => x.e);

  return (
    <div className="flex flex-col gap-[1em]">
      {showEmployee && <EmployeeBrief employee={emp} position={dir.position(emp)} department={dir.department(emp)} />}

      <div className="flex flex-wrap items-center gap-[0.6em] rounded-md bg-surface-2 px-[0.9em] py-[0.7em]">
        <LeaveTypeTag type={request.type} className="font-medium text-fg" />
        <span className="text-fg-muted">·</span>
        <span className="num text-sm text-fg-secondary">{date(request.from)} → {date(request.to)}</span>
        <Badge tone="neutral" dot={false}>{fmtDays(count.working)} ouvrés</Badge>
        <span className="text-xs text-fg-muted">({count.calendar} j calendaires)</span>
      </div>
      {request.reason && <p className="text-sm text-fg-secondary">« {request.reason} »</p>}

      <IssueList issues={a.issues} />

      <Section icon={CalendarOff} title="Solde avant / après">
        <BalanceImpact before={a.before} after={a.after} consumes={a.consumes} />
        {a.balance.pending > 0 && <p className="mt-[0.3em] text-xs text-fg-muted">{fmtDays(a.balance.pending)} déjà demandés par ailleurs (en attente).</p>}
      </Section>

      <Section icon={Users} title={`Équipe absente sur la période · ${a.teamOut.length}`}>
        {a.teamOut.length === 0 && a.teamPending.length === 0 ? (
          <p className="text-sm text-fg-secondary">Personne d’autre du service n’est absent ces jours-là.</p>
        ) : (
          <ul className="flex flex-col gap-[0.5em]">
            {names(a.teamOut).map(({ r, e }) => (
              <li key={r.id} className="flex items-center gap-[0.6em] text-sm">
                <Avatar employee={e} size="sm" />
                <span className="min-w-0 flex-1 truncate text-fg">{e.firstName} {e.lastName}</span>
                <span className="num text-xs text-fg-muted">{dateShort(r.from)} → {dateShort(r.to)}</span>
              </li>
            ))}
            {names(a.teamPending).map(({ r, e }) => (
              <li key={r.id} className="flex items-center gap-[0.6em] text-sm">
                <Avatar employee={e} size="sm" />
                <span className="min-w-0 flex-1 truncate text-fg-secondary">{e.firstName} {e.lastName} <span className="text-xs text-fg-muted">(demande en attente)</span></span>
                <span className="num text-xs text-fg-muted">{dateShort(r.from)} → {dateShort(r.to)}</span>
              </li>
            ))}
          </ul>
        )}
        {a.perDay.length > 0 && (
          <div className="mt-[0.9em]">
            <div className="relative flex h-[3em] items-end gap-[0.15em] rounded-md bg-surface-2 px-[0.4em] pb-[0.2em]" role="img" aria-label="Part du service absent, jour par jour">
              <span aria-hidden className="absolute inset-x-0 border-t border-dashed border-warning/70" style={{ bottom: `${CONFLICT_RATE * 100}%` }} />
              {a.perDay.map((d) => (
                <span
                  key={d.date}
                  title={`${date(d.date)} : ${d.out + 1} sur ${d.total} absents (${Math.round(d.rate * 100)} %)`}
                  className={cn("max-w-[1.2em] flex-1 rounded-t-xs", d.rate > CONFLICT_RATE ? "bg-warning" : "bg-pine-400")}
                  style={{ height: `${Math.max(8, d.rate * 100)}%` }}
                />
              ))}
            </div>
            <p className="mt-[0.35em] text-xs text-fg-muted">Part du service absent par jour ouvré, avec cette demande. Pointillé : seuil de {Math.round(CONFLICT_RATE * 100)} %.</p>
          </div>
        )}
      </Section>

      <Section icon={CalendarOff} title="Week-ends et jours fériés">
        <p className="text-sm text-fg-secondary">
          {count.weekend > 0 ? `${count.weekend} jour${count.weekend > 1 ? "s" : ""} de week-end (vendredi, samedi) exclu${count.weekend > 1 ? "s" : ""}.` : "Aucun week-end sur la période."}
        </p>
        {count.holidays.length > 0 ? (
          <ul className="mt-[0.4em] flex flex-col gap-[0.3em]">
            {count.holidays.map((h) => (
              <li key={h.date} className="flex items-center gap-[0.5em] text-sm text-fg-secondary">
                <Badge tone="neutral">Férié</Badge> {h.label} <span className="num text-xs text-fg-muted">({date(h.date)}), non décompté</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Aucun jour férié sur la période.</p>
        )}
      </Section>

      <Section icon={History} title="Historique récent">
        {a.history.length === 0 ? (
          <p className="text-sm text-fg-secondary">Aucune absence enregistrée.</p>
        ) : (
          <ul className="flex flex-col gap-[0.45em]">
            {a.history.map((h) => (
              <li key={h.id} className="flex items-center gap-[0.6em] text-sm">
                <LeaveTypeTag type={h.type} className="min-w-0 flex-1 truncate text-fg-secondary" />
                <span className="num text-xs text-fg-muted">{dateShort(h.from)} · {fmtDays(h.days)}</span>
                <StatusBadge status={h.status} map={LEAVE_STATUS} dot={false} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
