"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Award, Cake, Check, CheckCircle2, FileClock, Hourglass } from "lucide-react";
import { Avatar, AreaChart, Badge, BarList, Button, Card, CardHeader, EmptyState, KpiCard, Segmented } from "@/components/ui";
import { LEAVE_TYPES } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { addDays, diffDays, holidayOn, isWeekend, listDays, weekday } from "@/lib/dates";
import { dateLong, dateShort, fullName, int, money } from "@/lib/format";
import { duration, ease } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import CountUp from "./CountUp";
import { PRIORITY } from "./data";

const DAY_LETTER = ["D", "L", "M", "M", "J", "V", "S"];
const HATCH = "bg-[repeating-linear-gradient(135deg,transparent_0,transparent_0.22em,var(--border)_0.22em,var(--border)_0.3em)]";

/* ------------------------------------------------------------------ KPI */

export function KpiLink({ href, ...props }) {
  return (
    <Link href={href} className="block rounded-lg transition-transform duration-150 active:scale-[0.995]">
      <KpiCard {...props} className="h-full transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-md" />
    </Link>
  );
}

export const moneyCount = (v) => money(v, { decimals: 0 });
export const countNode = (value, format) => <CountUp value={value} format={format} />;

/* ------------------------------------------------------------------ À faire */

export function TodoCard({ tasks, title = "À faire", description = "Classé par priorité, une action par ligne." }) {
  return (
    <Card>
      <CardHeader title={title} description={description} action={tasks.length ? <Badge tone="neutral" dot={false}>{tasks.length}</Badge> : null} />
      {tasks.length ? (
        <ul className="-mx-[0.5em] flex flex-col">
          {tasks.map((t, i) => {
            const p = PRIORITY[t.priority];
            return (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: duration.panel, ease: ease.out, delay: 0.15 + i * 0.05 }}
                className="flex items-start gap-[0.8em] rounded-md px-[0.5em] py-[0.75em] hover:bg-surface-hover"
              >
                <span className="mt-[0.1em] flex size-[2.2em] shrink-0 items-center justify-center rounded-md bg-bg-sunken text-fg-secondary">
                  <t.icon className="size-[1.1em]" aria-hidden strokeWidth={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{t.title}</p>
                  <p className="mt-[0.1em] text-xs text-fg-muted">{t.detail}</p>
                  <Badge tone={p.tone} className="mt-[0.4em] !h-[1.5em]">{p.label}</Badge>
                </div>
                <Button href={t.href} variant="soft" size="sm" className="mt-[0.1em]">{t.cta}</Button>
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={CheckCircle2} title="Tout est à jour" description="Aucune action en attente. Les nouvelles tâches apparaîtront ici." className="!py-[1.5em]" />
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ Paie du mois */

export function PayrollTracker({ steps, done, title = "Paie d'octobre 2026", cta = { label: "Ouvrir la paie", href: "/app/payroll" } }) {
  const current = Math.min(done, steps.length - 1);
  const complete = done >= steps.length;
  const daysLeft = diffDays(TODAY, steps[current].date);
  return (
    <Card>
      <CardHeader
        title={title}
        description={complete ? "Cycle terminé : bulletins payés et déclarations déposées." : `Étape ${current + 1} sur ${steps.length} · ${steps[current].label} avant le ${dateShort(steps[current].date)} (${daysLeft >= 0 ? `dans ${daysLeft} j` : `${-daysLeft} j de retard`})`}
        action={cta && <Button href={cta.href} variant="secondary" size="sm">{cta.label}</Button>}
      />
      <ol className="grid gap-[0.9em] sm:grid-cols-5 sm:gap-0">
        {steps.map((s, i) => {
          const isDone = i < done;
          const isCurrent = i === current && !complete;
          return (
            <li key={s.key} className="relative flex items-center gap-[0.8em] sm:flex-col sm:gap-[0.6em] sm:text-center">
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute start-[calc(50%+1.5em)] top-[1.05em] hidden h-[2px] w-[calc(100%-3em)] overflow-hidden rounded-full bg-border sm:block">
                  <motion.span
                    className="block h-full origin-left bg-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isDone ? 1 : 0 }}
                    transition={{ duration: duration.reveal, ease: ease.out, delay: 0.2 + i * 0.1 }}
                  />
                </span>
              )}
              <span
                className={cn(
                  "relative z-[1] flex size-[2.1em] shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  isDone ? "bg-primary text-primary-fg" : isCurrent ? "border-2 border-primary bg-surface text-fg shadow-[0_0_0_0.25em_var(--primary-soft)]" : "border border-border-strong bg-surface text-fg-muted",
                )}
              >
                {isDone ? <Check className="size-[1.1em]" aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm", isCurrent ? "font-semibold text-fg" : isDone ? "font-medium text-fg-secondary" : "text-fg-muted")}>
                  {s.label}
                  <span className="sr-only"> {isDone ? "(terminée)" : isCurrent ? "(en cours)" : "(à venir)"}</span>
                </span>
                <span className="block text-xs text-fg-muted num">{isDone ? "Terminé" : dateShort(s.date)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/* ------------------------------------------------------------------ Coût par département */

export function CostByDept({ items }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <Card>
      <CardHeader
        title="Coût par département"
        description="Masse salariale brute prévue, octobre 2026"
        action={<Button href="/app/reports" variant="ghost" size="sm">Voir le détail</Button>}
      />
      <BarList
        items={items.map((i) => ({ label: `${i.label} · ${i.count}`, value: i.value, color: "var(--chart-1)" }))}
        format={(v) => `${money(v, { decimals: 0 })} · ${Math.round((v / total) * 100)} %`}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ Tendance */

export function TrendCard({ trend }) {
  const [view, setView] = useState("headcount");
  const compact = (v) => `${(v / 1e6).toFixed(1).replace(".", ",")} M`;
  const series = {
    headcount: [{ name: "Effectif", color: "var(--chart-1)", data: trend.headcount }],
    payroll: [
      { name: "Brut", color: "var(--chart-1)", data: trend.gross },
      { name: "Net à payer", color: "var(--chart-4)", data: trend.net },
    ],
  };
  return (
    <Card>
      <CardHeader
        title="Évolution sur 6 mois"
        description="* Octobre : estimation sur les dossiers actuels."
        action={<Segmented size="sm" value={view} onChange={setView} options={[{ value: "headcount", label: "Effectif" }, { value: "payroll", label: "Masse salariale" }, { value: "table", label: "Tableau" }]} />}
      />
      {view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="h-[2.2em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
                <th className="text-start">Mois</th><th className="text-end">Effectif</th><th className="text-end">Brut</th><th className="text-end">Net</th>
              </tr>
            </thead>
            <tbody>
              {trend.labels.map((l, i) => (
                <tr key={l} className="h-[2.2em] border-t border-border-subtle">
                  <td className="text-fg-secondary">{l}</td>
                  <td className="text-end num">{int(trend.headcount[i])}</td>
                  <td className="text-end num">{money(trend.gross[i], { decimals: 0 })}</td>
                  <td className="text-end num">{money(trend.net[i], { decimals: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <AreaChart series={series[view]} labels={trend.labels} height={200} format={view === "payroll" ? compact : (v) => Math.round(v)} />
          {view === "payroll" && (
            <ul className="mt-[0.5em] flex gap-[1.2em] text-xs text-fg-secondary">
              {series.payroll.map((s) => <li key={s.name} className="flex items-center gap-[0.4em]"><span aria-hidden className="size-[0.7em] rounded-full" style={{ background: s.color }} />{s.name}</li>)}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ Congés 14 jours */

export function LeaveStrip({ leaves, employees, scopeIds = null, title = "Congés des 14 prochains jours", href = "/app/leave/calendar", days = 14, max = 7 }) {
  const end = addDays(TODAY, days - 1);
  const dayList = listDays(TODAY, end);
  const byId = Object.fromEntries(employees.map((e) => [e.id, e]));
  const rows = leaves
    .filter((l) => ["approved", "taken", "pending"].includes(l.status) && l.to >= TODAY && l.from <= end && (!scopeIds || scopeIds.has(l.employeeId)) && byId[l.employeeId])
    .sort((a, b) => a.from.localeCompare(b.from));
  const shown = rows.slice(0, max);
  const usedTypes = [...new Set(shown.map((l) => l.type))];

  return (
    <Card>
      <CardHeader title={title} description={`${rows.length} absence${rows.length > 1 ? "s" : ""} planifiée${rows.length > 1 ? "s" : ""} · du ${dateShort(TODAY)} au ${dateShort(end)}`} action={<Button href={href} variant="ghost" size="sm">Calendrier</Button>} />
      <div className="overflow-x-auto">
        <div className="relative min-w-[40em]">
          <div className="grid grid-cols-[9.5em_repeat(14,minmax(0,1fr))] border-b border-border-subtle pb-[0.4em]">
            <span />
            {dayList.map((d, i) => {
              const off = isWeekend(d) || holidayOn(d);
              const today = i === 0;
              return (
                <span key={d} title={holidayOn(d)?.label} className={cn("flex flex-col items-center text-[0.7em] leading-tight", off ? "text-fg-faint" : "text-fg-muted")}>
                  <span>{DAY_LETTER[weekday(d)]}</span>
                  <span className={cn("num mt-[0.2em] flex size-[2em] items-center justify-center rounded-full text-[1.15em]", today ? "bg-accent font-semibold text-white" : "text-fg-secondary")}>{Number(d.slice(8))}</span>
                </span>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 start-[9.5em] end-0 grid grid-cols-14" aria-hidden>
            {dayList.map((d) => <span key={d} className={cn(isWeekend(d) || holidayOn(d) ? HATCH : "", "border-s border-border-subtle/60")} />)}
          </div>
          {shown.length ? (
            <ul className="relative pt-[0.3em]">
              {shown.map((l) => {
                const e = byId[l.employeeId];
                const c0 = diffDays(TODAY, l.from < TODAY ? TODAY : l.from) + 2;
                const c1 = diffDays(TODAY, l.to > end ? end : l.to) + 3;
                const color = LEAVE_TYPES[l.type]?.color ?? "var(--chart-7)";
                return (
                  <li key={l.id} className="grid grid-cols-[9.5em_repeat(14,minmax(0,1fr))] items-center py-[0.15em]">
                    <span className="flex min-w-0 items-center gap-[0.5em] pe-[0.5em]">
                      <Avatar employee={e} size="xs" />
                      <span className="truncate text-sm text-fg">{e.firstName} {e.lastName[0]}.</span>
                    </span>
                    <span
                      title={`${fullName(e)} · ${LEAVE_TYPES[l.type]?.label} · ${l.status === "pending" ? "en attente" : "validé"} · ${dateShort(l.from)} → ${dateShort(l.to)}`}
                      style={{ gridColumn: `${c0} / ${c1}`, background: `color-mix(in srgb, ${color} 24%, var(--surface))`, borderInlineStart: `0.2em solid ${color}`, outline: l.status === "pending" ? `1px dashed ${color}` : undefined }}
                      className="relative z-[1] flex h-[1.9em] items-center truncate rounded-sm px-[0.5em] text-xs text-fg"
                    >
                      {LEAVE_TYPES[l.type]?.label}{l.status === "pending" ? " (à valider)" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="relative py-[1.6em] text-center text-sm text-fg-muted">Aucun congé prévu sur cette période.</p>
          )}
        </div>
      </div>
      <ul className="mt-[0.9em] flex flex-wrap items-center gap-x-[1.1em] gap-y-[0.3em] text-xs text-fg-muted">
        {usedTypes.map((t) => <li key={t} className="flex items-center gap-[0.4em]"><span aria-hidden className="size-[0.7em] rounded-full" style={{ background: LEAVE_TYPES[t].color }} />{LEAVE_TYPES[t].label}</li>)}
        <li className="flex items-center gap-[0.4em]"><span aria-hidden className={cn("size-[0.9em] rounded-xs border border-border", HATCH)} />Vendredi, samedi et jours fériés</li>
        <li className="flex items-center gap-[0.4em]"><span aria-hidden className="size-[0.7em] rounded-full bg-accent" />Aujourd’hui</li>
        {rows.length > max && <li className="ms-auto">+ {rows.length - max} autres</li>}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ Événements */

const EVENT_META = {
  birthday: { icon: Cake, label: "Anniversaire" },
  anniversary: { icon: Award, label: "Ancienneté" },
  trial: { icon: Hourglass, label: "Période d'essai" },
  contract: { icon: FileClock, label: "Contrat" },
};

export function EventsCard({ events, limit = 7, title = "À venir" }) {
  const list = events.slice(0, limit);
  return (
    <Card>
      <CardHeader title={title} description="Anniversaires, fins de période d'essai et de contrat." />
      {list.length ? (
        <ul>
          {list.map((ev) => {
            const m = EVENT_META[ev.kind];
            const d = diffDays(TODAY, ev.date);
            return (
              <li key={ev.id} className="flex items-center gap-[0.8em] border-b border-border-subtle py-[0.6em] last:border-b-0">
                <span className="flex w-[3.2em] shrink-0 flex-col items-center rounded-md bg-bg-sunken py-[0.25em] text-center leading-tight">
                  <span className="font-display text-h3 font-semibold text-fg num">{Number(ev.date.slice(8))}</span>
                  <span className="text-[0.7em] text-fg-muted">{dateShort(ev.date).split(" ").slice(1).join(" ")}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/app/employees/${ev.employee.id}`} className="block truncate text-sm font-medium text-fg hover:underline">{fullName(ev.employee)}</Link>
                  <p className="flex items-center gap-[0.4em] truncate text-xs text-fg-muted"><m.icon className="size-[1.1em] shrink-0" aria-hidden />{ev.label}</p>
                </div>
                <span className="shrink-0 text-xs text-fg-muted num" title={dateLong(ev.date)}>{d === 0 ? "aujourd'hui" : `dans ${d} j`}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-fg-muted">Rien de prévu dans les prochaines semaines.</p>
      )}
    </Card>
  );
}
