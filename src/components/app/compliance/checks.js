// Pure builders for the compliance page: calendar events, dossier checklist and score.
import { addDays, diffDays, HOLIDAYS } from "@/lib/dates";
import { DECLARATION_KINDS, defaultPayDate } from "@/lib/payroll-run";

const dmyLabel = (period) => (period.length === 4 ? period : null);

/** Event: { id, date, kind, label, detail, tone, done, href } — tone ∈ success | warning | danger | info | neutral */
export function buildEvents({ declarations, employees, documents, runs, today, currentPeriod }) {
  const events = [];
  for (const d of declarations) {
    const k = DECLARATION_KINDS[d.kind];
    const late = d.status !== "filed" && d.dueDate < today;
    events.push({
      id: d.id,
      date: d.dueDate,
      kind: "declaration",
      label: `${k.label} · ${dmyLabel(d.period) ?? d.period}`,
      detail: d.status === "filed" ? `Déposée, réf. ${d.reference}` : k.long,
      tone: d.status === "filed" ? "success" : late ? "danger" : "warning",
      done: d.status === "filed",
      href: "/app/payroll/declarations",
      action: "Préparer",
    });
  }
  const payDate = defaultPayDate(currentPeriod);
  const run = runs.find((r) => r.period === currentPeriod);
  events.push(
    { id: "pay-validate", date: addDays(payDate, -2), kind: "payroll", label: "Validation de la paie d'octobre", detail: "Avant le virement des salaires", tone: run ? "success" : "warning", done: !!run, href: "/app/payroll/runs/new", action: "Ouvrir" },
    { id: "pay-date", date: payDate, kind: "payroll", label: "Paiement des salaires d'octobre", detail: "Virement groupé", tone: run?.status === "paid" ? "success" : "info", done: run?.status === "paid", href: "/app/payroll", action: "Ouvrir" },
  );
  for (const e of employees) {
    if (e.status === "sorti") continue;
    const end = e.contract?.endDate;
    if (end && e.contract.type !== "CDI" && end >= addDays(today, -30) && end <= addDays(today, 150)) {
      events.push({ id: `end-${e.id}`, date: end, kind: "contract", label: `Fin de ${e.contract.type} · ${e.firstName} ${e.lastName}`, detail: end < today ? "Échu, à régulariser" : "Renouveler ou préparer la sortie", tone: end < today ? "danger" : diffDays(today, end) <= 30 ? "warning" : "info", done: false, href: `/app/employees/${e.id}?tab=contract`, action: "Ouvrir" });
    }
    const trial = e.contract?.trialEnd;
    if (trial && trial >= today && trial <= addDays(today, 60)) {
      events.push({ id: `trial-${e.id}`, date: trial, kind: "contract", label: `Fin de période d'essai · ${e.firstName} ${e.lastName}`, detail: "Confirmer ou rompre l'essai", tone: "info", done: false, href: `/app/employees/${e.id}?tab=contract`, action: "Ouvrir" });
    }
  }
  for (const doc of documents) {
    if (!doc.expiresAt) continue;
    events.push({ id: `doc-${doc.id}`, date: doc.expiresAt, kind: "document", label: `Renouveler : ${doc.name.replace(/\.[a-z]+$/i, "")}`, detail: "Document arrivant à expiration", tone: doc.expiresAt < today ? "danger" : diffDays(today, doc.expiresAt) <= 60 ? "warning" : "info", done: false, href: "/app/documents", action: "Voir" });
  }
  for (const h of HOLIDAYS) {
    events.push({ id: `hol-${h.date}`, date: h.date, kind: "holiday", label: h.label, detail: h.estimated ? "Jour férié, date estimée" : "Jour férié légal", tone: "neutral", done: false, href: null });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export const EVENT_KINDS = {
  declaration: "Déclaration",
  payroll: "Paie",
  contract: "Contrats",
  document: "Documents",
  holiday: "Jours fériés",
};

/** Dossier checklist. Each item: { id, label, detail, ok, count, total, href, cta } */
export function buildChecklist({ employees, documents, declarations, runs, drafts, params, today, currentPeriod }) {
  const active = employees.filter((e) => e.status !== "sorti");
  const missing = (pick) => active.filter((e) => !pick(e));
  const noCnas = missing((e) => String(e.cnasNumber ?? "").trim());
  const noNin = missing((e) => String(e.nin ?? "").length >= 18);
  const noRib = missing((e) => String(e.rib ?? "").trim());
  const belowSnmg = active.filter((e) => e.baseSalary < params.snmg);
  const contractsIssue = active.filter((e) => e.contract?.type !== "CDI" && e.contract?.endDate && e.contract.endDate <= addDays(today, 30));
  const docsIssue = documents.filter((d) => d.expiresAt && d.expiresAt <= addDays(today, 60));
  const overdue = declarations.filter((d) => d.status !== "filed" && d.dueDate < today);
  const runStarted = runs.some((r) => r.period === currentPeriod) || drafts.some((d) => d.period === currentPeriod);
  const n = active.length;
  return [
    { id: "params", label: "Barèmes et taux à jour", detail: `Paramètres en vigueur depuis le ${params.effectiveFrom.split("-").reverse().join("/")}`, ok: params.effectiveFrom >= `${today.slice(0, 4)}-01-01`, count: 0, total: 1, href: "/app/settings", cta: "Paramètres" },
    { id: "snmg", label: "Aucun salaire sous le SNMG", detail: belowSnmg.length ? `${belowSnmg.length} salarié(s) sous ${params.snmg.toLocaleString("fr-FR")} DA` : "Tous les salaires de base respectent le SNMG", ok: !belowSnmg.length, count: belowSnmg.length, total: n, href: belowSnmg[0] ? `/app/employees/${belowSnmg[0].id}?tab=pay` : "/app/employees", cta: "Corriger" },
    { id: "cnas", label: "N° CNAS renseigné", detail: noCnas.length ? `Manquant pour ${noCnas.map((e) => `${e.firstName} ${e.lastName}`).slice(0, 2).join(", ")}${noCnas.length > 2 ? "…" : ""}` : "Tous les dossiers sont complets", ok: !noCnas.length, count: noCnas.length, total: n, href: noCnas[0] ? `/app/employees/${noCnas[0].id}` : "/app/employees", cta: "Compléter" },
    { id: "nin", label: "NIN renseigné (G29)", detail: noNin.length ? `${noNin.length} dossier(s) sans NIN complet` : "Requis pour le G29 dès la loi de finances 2026", ok: !noNin.length, count: noNin.length, total: n, href: "/app/employees", cta: "Compléter" },
    { id: "rib", label: "RIB renseigné", detail: noRib.length ? `${noRib.length} salarié(s) hors virement` : "Tous les salariés sont payables par virement", ok: !noRib.length, count: noRib.length, total: n, href: "/app/employees", cta: "Compléter" },
    { id: "contracts", label: "Contrats à durée déterminée à jour", detail: contractsIssue.length ? `${contractsIssue.length} contrat(s) échu(s) ou finissant sous 30 jours` : "Aucune échéance proche", ok: !contractsIssue.length, count: contractsIssue.length, total: active.filter((e) => e.contract?.type !== "CDI").length || 1, href: contractsIssue[0] ? `/app/employees/${contractsIssue[0].id}?tab=contract` : "/app/employees", cta: "Régulariser" },
    { id: "docs", label: "Documents réglementaires valides", detail: docsIssue.length ? `${docsIssue.length} document(s) expirent sous 60 jours` : "Aucun document à renouveler", ok: !docsIssue.length, count: docsIssue.length, total: documents.filter((d) => d.expiresAt).length || 1, href: "/app/documents", cta: "Voir" },
    { id: "declarations", label: "Déclarations déposées à temps", detail: overdue.length ? `${overdue.length} déclaration(s) en retard` : "Aucun retard : G50 et CNAS de septembre déposés", ok: !overdue.length, count: overdue.length, total: declarations.length, href: "/app/payroll/declarations", cta: "Déposer" },
    { id: "run", label: "Paie du mois lancée", detail: runStarted ? "Préparation en cours ou terminée" : "La paie d'octobre n'est pas encore lancée", ok: runStarted, count: runStarted ? 0 : 1, total: 1, href: "/app/payroll/runs/new", cta: "Lancer" },
  ];
}

export const scoreOf = (items) => (items.length ? Math.round((items.filter((i) => i.ok).length / items.length) * 100) : 0);
