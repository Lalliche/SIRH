import { TODAY } from "@/lib/clock";
import { addDays, diffDays } from "@/lib/dates";
import { attendanceStats, clamp, isActive, mockEnps, pct, riskyContracts, weeklyBuckets } from "@/components/app/_kit/metrics";

export const MIN_GROUP = 5; // privacy: never show aggregates for groups smaller than this

export const DRIVERS = [
  { key: "absence", label: "Présence", weight: 25, hint: "Absences et arrêts maladie" },
  { key: "punctuality", label: "Ponctualité", weight: 10, hint: "Part des arrivées en retard" },
  { key: "workload", label: "Charge", weight: 20, hint: "Heures supplémentaires par personne et par semaine" },
  { key: "leave", label: "Congés", weight: 15, hint: "Personnes avec un gros solde de congés non pris" },
  { key: "stability", label: "Stabilité", weight: 15, hint: "Départs sur 12 mois" },
  { key: "engagement", label: "Engagement", weight: 15, hint: "eNPS — enquête simulée" },
];

export const LEAVE_PILE = 20; // days of annual leave left unused = "à relancer"

export function level(score) {
  if (score >= 75) return { label: "Solide", tone: "success" };
  if (score >= 60) return { label: "À surveiller", tone: "warning" };
  return { label: "Fragile", tone: "danger" };
}

const composite = (scores) => Math.round(DRIVERS.reduce((s, d) => s + scores[d.key] * d.weight, 0) / 100);

const weeks = 3;
function scoresOf({ abs, late, ot, leaveShare, turnover, enps }) {
  return {
    absence: Math.round(clamp(100 - abs * 8)),
    punctuality: Math.round(clamp(100 - late * 3)),
    workload: Math.round(clamp(100 - ot * 12)),
    leave: Math.round(clamp(100 - leaveShare * 90)),
    stability: Math.round(clamp(100 - turnover * 4)),
    engagement: Math.round(clamp((enps + 100) / 2)),
  };
}

/**
 * Pulse for a group. `members` = every employee ever in the group (exits included),
 * `data` = { attendance, leaveRequests }.
 */
export function pulseFor(members, data, key) {
  const active = members.filter(isActive);
  if (active.length < MIN_GROUP) return { hidden: true, size: active.length };
  const ids = new Set(active.map((e) => e.id));
  const from = addDays(TODAY, -20);
  const full = attendanceStats(data, ids, from, TODAY);
  const ot = full.overtimePerPerson / weeks;
  const leaveHolders = active.filter((e) => e.leaveBalance.annual - e.leaveBalance.taken >= LEAVE_PILE);
  const leaveShare = leaveHolders.length / active.length;
  const yearAgo = addDays(TODAY, -365);
  const exits = members.filter((e) => e.exitDate && e.exitDate > yearAgo).length;
  const turnover = pct(exits, active.length + exits / 2);
  const enps = mockEnps(key);
  const fixed = { leaveShare, turnover, enps };
  const raw = { absentRate: full.absentRate, lateRate: full.lateRate, overtimeWeek: Math.round(ot * 10) / 10, leaveShare: Math.round(leaveShare * 100), leaveHolders: leaveHolders.length, turnover, exits, enps };
  const scores = scoresOf({ abs: full.absentRate, late: full.lateRate, ot, ...fixed });
  const trend = weeklyBuckets().map((w) => {
    const s = attendanceStats(data, ids, w.from, w.to);
    return composite(scoresOf({ abs: s.absentRate, late: s.lateRate, ot: s.overtimePerPerson, ...fixed }));
  });
  return { hidden: false, size: active.length, raw, scores, score: composite(scores), trend };
}

export function formatDriver(key, raw) {
  const f = (n) => String(n).replace(".", ",");
  switch (key) {
    case "absence": return `${f(raw.absentRate)} % d'absentéisme`;
    case "punctuality": return `${f(raw.lateRate)} % de retards`;
    case "workload": return `${f(raw.overtimeWeek)} h sup. / pers. / sem.`;
    case "leave": return `${raw.leaveHolders} pers. avec ≥ ${LEAVE_PILE} j non pris`;
    case "stability": return `${raw.exits} départ${raw.exits > 1 ? "s" : ""} · ${f(raw.turnover)} % sur 12 mois`;
    default: return `eNPS ${raw.enps > 0 ? "+" : ""}${raw.enps}`;
  }
}

/** Manager nudges for a scope. Counts only (no identities), suppressed for groups under MIN_GROUP. */
export function buildNudges(members, data, { isCompany, companyPulse, deptPulses }) {
  const active = members.filter(isActive);
  if (active.length < MIN_GROUP) return [];
  const out = [];
  const leave = active.filter((e) => e.leaveBalance.annual - e.leaveBalance.taken >= LEAVE_PILE);
  if (leave.length) out.push({ id: "leave", tone: "warning", title: `${leave.length} personne${leave.length > 1 ? "s" : ""} cumulent plus de ${LEAVE_PILE} jours de congé annuel non pris`, detail: "Le report de congés augmente le risque d'épuisement et la provision à constater. Proposez un calendrier de prise avant la fin d'année.", cta: { label: "Planifier les congés", href: "/app/leave" } });
  const ids = new Set(active.map((e) => e.id));
  const ot = attendanceStats(data, ids, addDays(TODAY, -20), TODAY);
  const perWeek = ot.overtimePerPerson / weeks;
  if (perWeek >= 1) out.push({ id: "overtime", tone: perWeek >= 2 ? "danger" : "warning", title: `${String(Math.round(perWeek * 10) / 10).replace(".", ",")} h supplémentaires par personne et par semaine`, detail: "La charge dépasse l'horaire contractuel de façon régulière. Vérifiez la planification ou le recours à des renforts.", cta: { label: "Voir le pointage", href: "/app/attendance" } });
  const late = attendanceStats(data, ids, addDays(TODAY, -6), TODAY);
  if (late.lateRate >= 10) out.push({ id: "late", tone: "warning", title: `${String(late.lateRate).replace(".", ",")} % d'arrivées en retard cette semaine`, detail: "Un rappel d'horaires ou un ajustement des navettes peut suffire.", cta: { label: "Voir le pointage", href: "/app/attendance" } });
  const sick = data.leaveRequests.filter((l) => l.type === "sick" && ids.has(l.employeeId) && ["approved", "taken"].includes(l.status) && l.from <= TODAY && l.to >= TODAY && diffDays(l.from, l.to) >= 20);
  if (sick.length) out.push({ id: "sick", tone: "info", title: `${sick.length} arrêt${sick.length > 1 ? "s" : ""} maladie de longue durée en cours`, detail: "Prévoyez le suivi de reprise et la répartition de la charge pendant l'absence.", cta: { label: "Voir les congés", href: "/app/leave" } });
  const contracts = riskyContracts(active).filter((c) => c.kind !== "trial");
  if (contracts.length) out.push({ id: "contracts", tone: "warning", title: `${contracts.length} contrat${contracts.length > 1 ? "s" : ""} à échéance ou expiré${contracts.length > 1 ? "s" : ""}`, detail: "Décidez du renouvellement ou de la fin de contrat avant l'échéance pour éviter une requalification.", cta: { label: "Ouvrir les dossiers", href: "/app/employees" } });
  const worst = deptPulses.filter((d) => !d.pulse.hidden).sort((a, b) => a.pulse.scores.engagement - b.pulse.scores.engagement)[0];
  if (isCompany && worst && worst.pulse.scores.engagement < companyPulse.scores.engagement) out.push({ id: "engagement", tone: "info", title: `Engagement le plus bas : ${worst.name} (eNPS ${worst.pulse.raw.enps > 0 ? "+" : ""}${worst.pulse.raw.enps})`, detail: "Un entretien collectif ou une enquête flash peut en révéler la cause (enquête simulée).", cta: { label: "Lancer un point d'équipe", href: "/app/announcements" } });
  return out;
}
