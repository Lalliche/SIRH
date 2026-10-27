import { TODAY } from "@/lib/clock";
import { diffDays } from "@/lib/dates";

export const GOAL_STATUS = {
  on_track: { label: "Dans les temps", tone: "success", ring: "success" },
  at_risk: { label: "À risque", tone: "warning", ring: "warning" },
  behind: { label: "En retard", tone: "danger", ring: "danger" },
  done: { label: "Atteint", tone: "brand", ring: "primary" },
};

// "T4 2026" → { start, end }
export function quarterRange(q) {
  const [t, y] = q.split(" ");
  const n = Number(t.slice(1));
  const start = `${y}-${String((n - 1) * 3 + 1).padStart(2, "0")}-01`;
  const endMonth = n * 3;
  const endDay = new Date(Date.UTC(Number(y), endMonth, 0)).getUTCDate();
  return { start, end: `${y}-${String(endMonth).padStart(2, "0")}-${endDay}` };
}
export const quarterOf = (iso) => `T${Math.ceil(Number(iso.slice(5, 7)) / 3)} ${iso.slice(0, 4)}`;
export const quarterKey = (q) => { const [t, y] = q.split(" "); return Number(y) * 10 + Number(t.slice(1)); };
export const nextQuarter = (q) => { const [t, y] = q.split(" "); const n = Number(t.slice(1)); return n === 4 ? `T1 ${Number(y) + 1}` : `T${n + 1} ${y}`; };

/** Share of the quarter already elapsed (0–100) — the pace a goal should follow. */
export function expectedProgress(q) {
  const { start, end } = quarterRange(q);
  const total = diffDays(start, end) + 1;
  return Math.min(100, Math.max(0, Math.round((diffDays(start, TODAY) / total) * 100)));
}

export function suggestStatus(progress, q) {
  if (progress >= 100) return "done";
  const gap = expectedProgress(q) - progress;
  return gap > 25 ? "behind" : gap > 10 ? "at_risk" : "on_track";
}

export const meanProgress = (krs) => (krs.length ? Math.round(krs.reduce((s, k) => s + k.progress, 0) / krs.length) : 0);

export const TEMPLATES = [
  { title: "Réduire l'absentéisme sous 3 %", krs: ["Suivre le taux chaque semaine", "Entretiens de retour après 3 absences", "Taux mensuel ≤ 3 % en fin de trimestre"] },
  { title: "Livrer le projet prioritaire dans les délais", krs: ["Cahier des charges validé", "Jalons hebdomadaires tenus", "Recette finale signée"] },
  { title: "Améliorer la satisfaction client", krs: ["Enquête clients envoyée", "Traiter 100 % des réclamations sous 48 h", "Score de satisfaction ≥ 8/10"] },
  { title: "Former l'équipe aux nouvelles procédures", krs: ["Plan de formation validé", "100 % de l'équipe formée", "Évaluation de fin de session ≥ 80 %"] },
  { title: "Réduire les coûts de fonctionnement de 10 %", krs: ["Cartographier les dépenses", "Renégocier 3 contrats fournisseurs", "Économie mesurée en fin de trimestre"] },
  { title: "Atteindre l'objectif commercial du trimestre", krs: ["Pipeline qualifié constitué", "Visites clients planifiées", "Chiffre d'affaires cible atteint"] },
];

// Demo enrichment for the seeded goals: three key results whose mean matches the stored progress.
const DEMO_TEXT = {
  "gl-001": ["Mesurer le rebut ligne 02 chaque semaine", "Déployer la maintenance préventive", "Rebut mensuel ≤ 1,8 % en décembre"],
  "gl-002": ["Cibler 30 enseignes de la grande distribution", "Présenter l'offre à 20 centrales d'achat", "Signer 12 nouveaux comptes"],
  "gl-003": ["Installer le nouveau serveur", "Migrer les bases de données", "Basculer les utilisateurs et clôturer l'ancien serveur"],
  "gl-004": ["Scanner les dossiers papier", "Contrôler les pièces obligatoires", "Archiver et supprimer les doublons"],
  "gl-005": ["Fiabiliser l'inventaire permanent", "Revoir les seuils de réapprovisionnement", "Ruptures de stock < 2 % sur le mois"],
  "gl-006": ["Audit interne à blanc", "Corriger les non-conformités", "Audit de certification réussi"],
  "gl-007": ["Causeries sécurité hebdomadaires", "Vérifier les EPI chaque semaine", "Aucun incident déclaré"],
  "gl-008": ["Fiabiliser les rapprochements bancaires", "Automatiser les écritures récurrentes", "Clôture mensuelle en J+5"],
};
export function demoKeyResults(goal) {
  const texts = DEMO_TEXT[goal.id];
  if (!texts) return [];
  const p = goal.progress;
  const v = p >= 100 ? [100, 100, 100] : (() => {
    const a = Math.min(100, p + 20);
    const c = Math.min(100, Math.max(0, 3 * p - a - p));
    return [a, p, c];
  })();
  return texts.map((text, i) => ({ id: `${goal.id}-kr${i + 1}`, text, progress: Math.round(v[i]) }));
}
