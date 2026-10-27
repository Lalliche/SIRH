import { TODAY } from "@/lib/clock";
import { isActive } from "@/components/app/_kit/metrics";

export const ANNUAL_BUDGET = 700000; // DA — enveloppe formation 2026 (démo)

export const TRAINING_STATUS = {
  planned: { label: "Planifiée", tone: "info" },
  inprogress: { label: "En cours", tone: "brand" },
  done: { label: "Terminée", tone: "success" },
  cancelled: { label: "Annulée", tone: "neutral" },
};

export const statusOf = (t) => {
  if (t.status === "cancelled") return "cancelled";
  if (t.status === "done" || t.to < TODAY) return "done";
  return t.from <= TODAY ? "inprogress" : "planned";
};

// Who must hold each mandatory training (by title). Default: every active employee.
const SCOPES = [{ match: /électrique/i, departments: ["dep-prod", "dep-log", "dep-qual"], label: "Production, logistique, qualité" }];
export function scopeOf(training, employees) {
  const rule = SCOPES.find((s) => s.match.test(training.title));
  const active = employees.filter(isActive);
  return { people: rule ? active.filter((e) => rule.departments.includes(e.departmentId)) : active, label: rule?.label ?? "Tous les salariés" };
}

/** One entry per mandatory training title: trained / enrolled / still missing. */
export function mandatoryCompliance(trainings, employees) {
  const titles = [...new Set(trainings.filter((t) => t.mandatory).map((t) => t.title))];
  return titles.map((title) => {
    const sessions = trainings.filter((t) => t.title === title && statusOf(t) !== "cancelled");
    const ref = sessions[0];
    const { people, label } = scopeOf(ref, employees);
    const trained = new Set(sessions.filter((s) => statusOf(s) === "done").flatMap((s) => s.participantIds));
    const upcoming = sessions.filter((s) => statusOf(s) !== "done").sort((a, b) => a.from.localeCompare(b.from));
    const enrolled = new Set(upcoming.flatMap((s) => s.participantIds));
    const missing = people.filter((e) => !trained.has(e.id) && !enrolled.has(e.id));
    return {
      title,
      scopeLabel: label,
      total: people.length,
      trained: people.filter((e) => trained.has(e.id)).length,
      enrolled: people.filter((e) => !trained.has(e.id) && enrolled.has(e.id)).length,
      missing,
      next: upcoming[0] ?? null,
    };
  });
}

export const yearOf = (t) => t.from.slice(0, 4);
