"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles, Target } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, SelectInput, Tabs } from "@/components/ui";
import ProgressRing from "@/components/app/_kit/ProgressRing";
import AccessGate from "@/components/app/_kit/AccessGate";
import { teamOf } from "@/components/app/_kit/metrics";
import { db, useCollection } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { cn } from "@/lib/utils";
import GoalCard from "./GoalCard";
import GoalDrawer from "./GoalDrawer";
import GoalCreateModal from "./GoalCreateModal";
import TeamRollup from "./TeamRollup";
import { GOAL_STATUS, TEMPLATES, demoKeyResults, nextQuarter, quarterKey, quarterOf } from "./helpers";

function Content({ user }) {
  const goals = useCollection("goals");
  const employees = useCollection("employees");
  const departments = useCollection("departments");

  const current = quarterOf(TODAY);
  const quarters = useMemo(
    () => [...new Set([current, nextQuarter(current), ...goals.map((g) => g.quarter)])].sort((a, b) => quarterKey(b) - quarterKey(a)),
    [goals, current],
  );
  const [quarter, setQuarter] = useState(current);
  const [tab, setTab] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [openId, setOpenId] = useState(null);
  const [create, setCreate] = useState(null);

  // One-off enrichment: seeded goals get their key results (idempotent).
  useEffect(() => {
    if (goals.some((g) => !g.keyResults)) {
      db.update("goals", (list) => list.map((g) => (g.keyResults ? g : { ...g, keyResults: demoKeyResults(g), checkIns: g.checkIns ?? [] })));
    }
  }, [goals]);

  const isLead = user.role === "manager" || user.role === "admin" || user.role === "hr";
  const team = useMemo(() => {
    if (user.role === "manager") return teamOf(employees, departments, user.employeeId);
    if (user.role === "admin" || user.role === "hr") return employees.filter((e) => e.status !== "sorti" && e.id !== user.employeeId);
    return [];
  }, [employees, departments, user]);
  const teamIds = useMemo(() => new Set(team.map((e) => e.id)), [team]);

  const inQuarter = useMemo(() => goals.filter((g) => g.quarter === quarter), [goals, quarter]);
  const scoped = {
    mine: inQuarter.filter((g) => g.employeeId === user.employeeId),
    team: inQuarter.filter((g) => teamIds.has(g.employeeId)),
    review: inQuarter.filter((g) => g.reviewerId === user.employeeId),
  };
  // Leads with no goal of their own land on the team view instead of an empty page.
  const activeTab = !isLead ? "mine" : tab ?? (scoped.mine.length === 0 && scoped.team.length > 0 ? "team" : "mine");
  const list = scoped[activeTab]
    .filter((g) => !statusFilter || g.status === statusFilter)
    .filter((g) => !ownerFilter || g.employeeId === ownerFilter);

  const tabs = [
    { value: "mine", label: "Mes objectifs", count: scoped.mine.length },
    ...(isLead ? [{ value: "team", label: user.role === "manager" ? "Mon équipe" : "Toute l'entreprise", count: scoped.team.length }] : []),
    ...(isLead ? [{ value: "review", label: "À évaluer", count: scoped.review.length }] : []),
  ];

  const rowsNow = scoped[activeTab];
  const summary = {
    avg: rowsNow.length ? Math.round(rowsNow.reduce((s, g) => s + g.progress, 0) / rowsNow.length) : 0,
    total: rowsNow.length,
    counts: Object.keys(GOAL_STATUS).map((k) => [k, rowsNow.filter((g) => g.status === k).length]),
  };

  const ownerOptions = user.role === "employee" ? employees.filter((e) => e.id === user.employeeId) : [employees.find((e) => e.id === user.employeeId), ...team].filter(Boolean);
  const reviewerOptions = employees.filter((e) => e.status !== "sorti" && (e.role !== "employee" || team.some((t) => t.id === e.id)) && e.role !== "accountant");
  const emp = (id) => employees.find((e) => e.id === id);
  const openGoal = goals.find((g) => g.id === openId) ?? null;
  const canEditOpen = openGoal && (openGoal.employeeId === user.employeeId || openGoal.reviewerId === user.employeeId || teamIds.has(openGoal.employeeId) || user.role === "admin" || user.role === "hr");
  const openCreate = (preset) => setCreate({ preset, key: Math.random() });

  return (
    <>
      <PageHeader
        title="Objectifs"
        description="Des objectifs clairs, des résultats clés mesurables et un point d'avancement régulier plutôt qu'un bilan annuel."
        actions={<Button icon={Plus} onClick={() => openCreate()}>Créer un objectif</Button>}
      />

      <div className="mb-[1.25em] flex flex-wrap items-end justify-between gap-[1em]">
        <Tabs tabs={tabs} value={activeTab} onChange={(v) => { setTab(v); setOwnerFilter(""); }} className="min-w-0 flex-1" />
        <div className="flex gap-[0.6em]">
          <SelectInput aria-label="Trimestre" className="w-[9em]" value={quarter} onChange={setQuarter} options={quarters} />
          <SelectInput aria-label="Statut" className="w-[11em]" value={statusFilter} onChange={setStatusFilter} placeholder="Tous les statuts" options={Object.entries(GOAL_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
        </div>
      </div>

      {scoped[activeTab].length > 0 && (
        <Card className="mb-[1.25em] flex flex-wrap items-center gap-x-[2em] gap-y-[1em] !p-[1.1em]">
          <div className="flex items-center gap-[1em]">
            <ProgressRing value={summary.avg} size="4em" stroke={10} label={`Avancement moyen ${summary.avg} %`} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Avancement moyen · {quarter}</p>
              <p className="text-fg-secondary"><span className="font-semibold text-fg num">{summary.total}</span> objectif{summary.total > 1 ? "s" : ""}</p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-[0.5em]">
            {summary.counts.map(([k, c]) => (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === k ? "" : k)}
                  aria-pressed={statusFilter === k}
                  className={cn("rounded-sm outline-offset-2", statusFilter === k && "ring-2 ring-ring")}
                >
                  <Badge tone={GOAL_STATUS[k].tone}>{c} · {GOAL_STATUS[k].label}</Badge>
                </button>
              </li>
            ))}
          </ul>
          <p className="ms-auto hidden text-xs text-fg-muted lg:block">Cliquez sur un statut pour filtrer.</p>
        </Card>
      )}

      {activeTab === "team" && scoped.team.length > 0 && !ownerFilter && (
        <div className="mb-[1.25em]"><TeamRollup goals={scoped.team} employees={employees} onPick={setOwnerFilter} /></div>
      )}
      {ownerFilter && (
        <div className="mb-[1em] flex items-center gap-[0.6em] text-sm text-fg-secondary">
          Objectifs de <span className="font-medium text-fg">{emp(ownerFilter)?.firstName} {emp(ownerFilter)?.lastName}</span>
          <Button variant="ghost" size="sm" onClick={() => setOwnerFilter("")}>Voir toute l&apos;équipe</Button>
        </div>
      )}

      {list.length > 0 ? (
        <div className="grid gap-[1em] md:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => (
            <GoalCard key={g.id} goal={g} owner={emp(g.employeeId)} reviewer={emp(g.reviewerId)} onOpen={() => setOpenId(g.id)} />
          ))}
        </div>
      ) : scoped[activeTab].length > 0 ? (
        <EmptyState icon={Target} title="Aucun objectif avec ce statut" description="Retirez le filtre pour revoir l'ensemble des objectifs du trimestre." action={<Button variant="secondary" onClick={() => { setStatusFilter(""); setOwnerFilter(""); }}>Effacer les filtres</Button>} />
      ) : (
        <Card className="!p-0">
          <EmptyState
            icon={Target}
            title={activeTab === "review" ? "Aucun objectif à évaluer" : `Aucun objectif pour ${quarter}`}
            description={activeTab === "review" ? "Les objectifs dont vous êtes l'évaluateur apparaîtront ici." : "Partez d'un modèle ou écrivez le vôtre. Deux ou trois objectifs bien choisis valent mieux que dix."}
            action={<Button icon={Plus} onClick={() => openCreate()}>Créer un objectif</Button>}
          />
          {activeTab === "mine" && (
            <div className="border-t border-border-subtle p-[1.25em]">
              <p className="mb-[0.8em] flex items-center gap-[0.5em] text-sm font-medium text-fg-secondary"><Sparkles className="size-[1.1em] text-fg-muted" aria-hidden />Modèles suggérés</p>
              <ul className="grid gap-[0.6em] sm:grid-cols-2 lg:grid-cols-3">
                {TEMPLATES.map((t) => (
                  <li key={t.title}>
                    <button type="button" onClick={() => openCreate(t)} className="h-full w-full rounded-md border border-border bg-surface px-[1em] py-[0.8em] text-start text-sm text-fg transition-[border-color,background-color] hover:border-border-strong hover:bg-surface-hover">
                      <span className="block font-medium">{t.title}</span>
                      <span className="mt-[0.2em] block text-xs text-fg-muted">{t.krs.length} résultats clés préremplis</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <GoalDrawer
        key={openId ?? "none"}
        goal={openGoal}
        owner={openGoal && emp(openGoal.employeeId)}
        reviewer={openGoal && emp(openGoal.reviewerId)}
        employees={employees}
        canEdit={!!canEditOpen}
        onClose={() => setOpenId(null)}
      />
      {create && (
        <GoalCreateModal
          key={create.key}
          open
          user={user}
          employees={employees}
          ownerOptions={ownerOptions}
          reviewerOptions={reviewerOptions}
          quarters={quarters}
          defaultQuarter={quarter}
          preset={create.preset}
          onClose={(g) => { setCreate(null); if (g) { setQuarter(g.quarter); setTab(g.employeeId === user.employeeId ? "mine" : "team"); setOpenId(g.id); } }}
        />
      )}
    </>
  );
}

export default function GoalsView() {
  return <AccessGate>{(user) => <Content user={user} />}</AccessGate>;
}
