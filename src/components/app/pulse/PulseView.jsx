"use client";

import { useMemo, useState } from "react";
import { ArrowRight, EyeOff, Info, Lightbulb, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, SelectInput, Sparkline } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import ProgressRing from "@/components/app/_kit/ProgressRing";
import { teamOf } from "@/components/app/_kit/metrics";
import { useCollection } from "@/lib/db";
import { cn } from "@/lib/utils";
import Radar from "./Radar";
import HeatTable from "./HeatTable";
import { DRIVERS, MIN_GROUP, buildNudges, formatDriver, level, pulseFor } from "./compute";

const toneRing = { success: "success", warning: "warning", danger: "danger" };

function Content({ user }) {
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const attendance = useCollection("attendance");
  const leaveRequests = useCollection("leaveRequests");
  const data = useMemo(() => ({ attendance, leaveRequests }), [attendance, leaveRequests]);

  const isManager = user.role === "manager";
  const [scope, setScope] = useState("all");

  const company = useMemo(() => pulseFor(employees, data, "company"), [employees, data]);
  const deptRows = useMemo(
    () => departments.map((d) => ({ id: d.id, name: d.name, pulse: pulseFor(employees.filter((e) => e.departmentId === d.id), data, d.id) })),
    [departments, employees, data],
  );

  // Manager: only their own team. Admin / HR: whole company or one department.
  const teamMembers = useMemo(() => (isManager ? teamOf(employees, departments, user.employeeId) : []), [isManager, employees, departments, user.employeeId]);
  const teamPulse = useMemo(() => (isManager ? pulseFor(teamMembers, data, `team:${user.employeeId}`) : null), [isManager, teamMembers, data, user.employeeId]);

  const activeScope = isManager ? "team" : scope;
  const current = isManager ? teamPulse : activeScope === "all" ? company : deptRows.find((d) => d.id === activeScope)?.pulse ?? company;
  const label = isManager ? "Mon équipe" : activeScope === "all" ? "Toute l'entreprise" : deptRows.find((d) => d.id === activeScope)?.name;
  const members = isManager ? teamMembers : activeScope === "all" ? employees : employees.filter((e) => e.departmentId === activeScope);
  const nudges = useMemo(
    () => buildNudges(members, data, { isCompany: !isManager && activeScope === "all", companyPulse: company, deptPulses: deptRows }),
    [members, data, isManager, activeScope, company, deptRows],
  );
  const visibleRows = isManager ? [] : deptRows;

  if (current.hidden) {
    return (
      <>
        <PageHeader title="Pouls des équipes" description="Score de santé composite et facteurs d'attention, calculés à partir de vos données RH." />
        <EmptyState
          icon={EyeOff}
          title="Groupe trop petit pour être affiché"
          description={`Pour protéger la confidentialité, les indicateurs ne sont jamais montrés pour moins de ${MIN_GROUP} personnes (ici ${current.size}). Les alertes individuelles passent par les congés, le pointage et les dossiers.`}
          action={isManager ? <Button href="/app/leave">Voir les congés de l&apos;équipe</Button> : <Button variant="secondary" onClick={() => setScope("all")}>Voir toute l&apos;entreprise</Button>}
        />
      </>
    );
  }

  const lv = level(current.score);
  const delta = current.trend[current.trend.length - 1] - current.trend[0];
  const TrendIcon = delta > 1 ? TrendingUp : delta < -1 ? TrendingDown : Minus;

  return (
    <>
      <PageHeader
        title="Pouls des équipes"
        description="Un score de santé de 0 à 100 et ses facteurs, calculés à partir du pointage, des congés et des départs. Les groupes de moins de 5 personnes ne sont jamais affichés."
        actions={
          !isManager && (
            <SelectInput
              aria-label="Périmètre"
              className="w-[15em]"
              value={scope}
              onChange={setScope}
              options={[{ value: "all", label: "Toute l'entreprise" }, ...deptRows.filter((d) => !d.pulse.hidden).map((d) => ({ value: d.id, label: d.name }))]}
            />
          )
        }
      />

      <div className="grid gap-[1em] lg:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader title={label} description={`${current.size} personnes · 21 derniers jours de pointage`} action={<Badge tone={lv.tone}>{lv.label}</Badge>} />
          <div className="flex flex-wrap items-center gap-[1.5em]">
            <ProgressRing value={current.score} size="9em" stroke={8} tone={toneRing[lv.tone]} label={`Score de santé ${current.score} sur 100`}>
              <span className="flex flex-col items-center">
                <span className="font-display text-display font-semibold leading-none text-fg num">{current.score}</span>
                <span className="mt-[0.2em] text-xs text-fg-muted">sur 100</span>
              </span>
            </ProgressRing>
            <div className="min-w-[10em] flex-1">
              <p className="flex items-center gap-[0.4em] text-sm text-fg-secondary">
                <TrendIcon className="size-[1.2em]" aria-hidden />
                {delta > 1 ? `+${delta} pts` : delta < -1 ? `${delta} pts` : "Stable"} <span className="text-fg-muted">sur 3 semaines</span>
              </p>
              <Sparkline data={current.trend} className="mt-[0.6em] h-[3em] w-full" />
              <div className="mt-[0.2em] flex justify-between text-[0.7em] text-fg-muted"><span>il y a 2 sem.</span><span>cette semaine</span></div>
            </div>
          </div>
          <ul className="mt-[1.25em] flex flex-col divide-y divide-border-subtle border-t border-border-subtle">
            {DRIVERS.map((d) => {
              const s = current.scores[d.key];
              const ref = company.scores?.[d.key];
              const diff = ref != null && current !== company ? s - ref : null;
              return (
                <li key={d.key} className="grid grid-cols-[6.5em_1fr_auto] items-center gap-x-[0.8em] gap-y-[0.2em] py-[0.65em]">
                  <span className="text-sm font-medium text-fg">{d.label}</span>
                  <span className="min-w-0 truncate text-xs text-fg-muted" title={d.hint}>{formatDriver(d.key, current.raw)}</span>
                  <span className="flex items-center gap-[0.5em] justify-self-end">
                    {diff != null && <span className="text-xs text-fg-muted num">{diff > 0 ? "+" : ""}{diff} vs entreprise</span>}
                    <span className={cn("inline-flex h-[1.8em] min-w-[2.6em] items-center justify-center rounded-sm text-sm font-semibold num", s >= 75 ? "bg-success-bg text-success-fg" : s >= 60 ? "bg-warning-bg text-warning-fg" : "bg-danger-bg text-danger-fg")}>{s}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-[0.8em] flex items-start gap-[0.5em] text-xs text-fg-muted"><Info className="mt-[0.15em] size-[1.1em] shrink-0" aria-hidden />L&apos;engagement provient d&apos;une enquête simulée (démo). Les autres facteurs sont calculés sur vos données réelles.</p>
        </Card>

        <div className="flex flex-col gap-[1em]">
          <Card>
            <CardHeader title="Profil par facteur" description={current === company ? "Entreprise entière" : `${label} comparé à l'entreprise`} />
            <Radar scores={current.scores} reference={current === company ? null : company.scores} label={label} />
          </Card>
        </div>
      </div>

      <section aria-labelledby="nudges" className="mt-[1.5em]">
        <h2 id="nudges" className="mb-[0.8em] flex items-center gap-[0.5em] text-h3 font-semibold text-fg"><Lightbulb className="size-[1.1em] text-fg-muted" aria-hidden />À faire avec votre équipe</h2>
        {nudges.length === 0 ? (
          <Card className="text-sm text-fg-secondary">Rien à signaler pour ce périmètre. Revenez la semaine prochaine : les indicateurs se mettent à jour avec le pointage.</Card>
        ) : (
          <ul className="grid gap-[0.8em] md:grid-cols-2">
            {nudges.map((n) => (
              <li key={n.id}>
                <Card className="flex h-full flex-col gap-[0.6em] !p-[1.1em]">
                  <Badge tone={n.tone} className="self-start">{n.tone === "danger" ? "Prioritaire" : n.tone === "warning" ? "À traiter" : "Information"}</Badge>
                  <p className="font-medium text-fg">{n.title}</p>
                  <p className="text-sm text-fg-secondary">{n.detail}</p>
                  <Button className="mt-auto self-start" variant="soft" size="sm" iconEnd={ArrowRight} href={n.cta.href}>{n.cta.label}</Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isManager && (
        <section aria-labelledby="heat" className="mt-[1.5em]">
          <h2 id="heat" className="mb-[0.8em] text-h3 font-semibold text-fg">Carte de chaleur par service</h2>
          <HeatTable rows={visibleRows} selected={activeScope} onSelect={setScope} />
        </section>
      )}
    </>
  );
}

export default function PulseView() {
  return <AccessGate roles={["admin", "hr", "manager"]}>{(user) => <Content user={user} />}</AccessGate>;
}
