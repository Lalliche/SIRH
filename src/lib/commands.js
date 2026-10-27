import {
  CalendarPlus, FilePlus2, Wallet, UserPlus, Calculator, DatabaseBackup, ArrowLeftRight, SunMoon,
  Sparkles, Search, UserRound, FolderOpen, ReceiptText, CalendarClock, HandCoins, Bell,
} from "lucide-react";
import { navGroups } from "@/content/nav";
import { CURRENT_PERIOD } from "@/lib/clock";
import { fullName, monthName } from "@/lib/format";

// ---------------------------------------------------------------------------
// Text matching (shared by the palette, the search page and the assistant)
// ---------------------------------------------------------------------------

/** lower-case, accent-free, punctuation-free */
export function normalize(s) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`\-_.,;:!?()«»"/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenScore(tok, words, text) {
  if (words.some((w) => w.startsWith(tok))) return 100;
  if (text.includes(tok)) return 60;
  return 0;
}

/** 0 = no match. Higher = better. Prefix > word-prefix > substring > all-tokens > loose subsequence. */
export function fuzzyScore(query, text) {
  const q = normalize(query);
  const t = normalize(text);
  if (!q) return 1;
  if (!t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  const words = t.split(" ");
  if (words.some((w) => w.startsWith(q))) return 80;
  const idx = t.indexOf(q);
  if (idx >= 0) return 65 - Math.min(idx, 20) * 0.5;
  const qt = q.split(" ");
  if (qt.length > 1) {
    let sum = 0;
    for (const tok of qt) {
      const s = tokenScore(tok, words, t);
      if (!s) {
        sum = 0;
        break;
      }
      sum += s;
    }
    if (sum) return 40 + (sum / qt.length) * 0.2;
  }
  const flat = q.replace(/ /g, "");
  if (flat.length < 3) return 0;
  let from = 0;
  let last = -1;
  let gaps = 0;
  for (const ch of flat) {
    const j = t.indexOf(ch, from);
    if (j < 0) return 0;
    if (last >= 0) gaps += j - last - 1;
    last = j;
    from = j + 1;
  }
  const score = 30 - gaps * 1.5;
  return score > 8 ? score : 0;
}

const MONTH_KEYS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

/** { month:1-12, period:"2026-09" } from free text ("bulletin septembre", "en novembre 2026") */
export function parseMonth(text) {
  const n = normalize(text);
  const idx = MONTH_KEYS.findIndex((m) => new RegExp(`\\b${m}\\b`).test(n));
  if (idx < 0) return null;
  const month = idx + 1;
  const explicit = n.match(/\b(20\d{2})\b/);
  const [cy, cm] = CURRENT_PERIOD.split("-").map(Number);
  const year = explicit ? Number(explicit[1]) : month > cm + 2 ? cy - 1 : cy;
  return { month, year, period: `${year}-${String(month).padStart(2, "0")}` };
}

export const monthRegexSource = MONTH_KEYS.join("|");
export const monthFromKey = (key) => MONTH_KEYS.indexOf(normalize(key)) + 1;

const SELF_WORDS = new Set(["moi", "me", "mon", "ma", "mes", "je", "j", "m"]);
export const mentionsSelf = (text) => normalize(text).split(" ").some((w) => SELF_WORDS.has(w));

/** Employees named inside a sentence. Returns [{ employee, score }] sorted (score 5 = first+last name). */
export function mentionedEmployees(text, employees) {
  const n = ` ${normalize(text)} `;
  const out = [];
  for (const e of employees) {
    const first = normalize(e.firstName);
    const last = normalize(e.lastName);
    const f = first.length > 2 && n.includes(` ${first} `);
    const l = last.length > 2 && n.includes(` ${last} `);
    const score = (f ? 2 : 0) + (l ? 3 : 0);
    if (score) out.push({ employee: e, score: score + (e.status === "sorti" ? -0.5 : 0) });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Fuzzy employee lookup for a short query ("sofiane", "TI-0012", "nadia saadi"). */
export function findEmployees(query, employees, positions = []) {
  const posTitle = Object.fromEntries(positions.map((p) => [p.id, p.title]));
  const out = [];
  for (const e of employees) {
    const name = fullName(e);
    const s = Math.max(
      fuzzyScore(query, name),
      fuzzyScore(query, `${e.lastName} ${e.firstName}`),
      fuzzyScore(query, e.matricule) * 0.95,
      fuzzyScore(query, posTitle[e.positionId] ?? "") * 0.6,
    );
    if (s > 0) out.push({ employee: e, score: s - (e.status === "sorti" ? 5 : 0) });
  }
  return out.sort((a, b) => b.score - a.score || a.employee.lastName.localeCompare(b.employee.lastName, "fr"));
}

// ---------------------------------------------------------------------------
// Command registry
// ---------------------------------------------------------------------------

const ALL = ["admin", "hr", "manager", "accountant", "employee"];
const PAY = ["admin", "hr", "accountant"];

export const GROUP_LABELS = {
  recent: "Récents",
  context: "Sur cette fiche",
  smart: "Commandes rapides",
  actions: "Actions",
  nav: "Navigation",
  employees: "Employés",
  ai: "Aller plus loin",
};
export const GROUP_ORDER = ["recent", "context", "smart", "actions", "nav", "employees", "ai"];
const GROUP_LIMIT = { smart: 4, actions: 6, nav: 7, employees: 6, recent: 5, context: 4, ai: 2 };

const deMois = (m) => (/^[aeiouhéèàô]/i.test(monthName(m)) ? `d'${monthName(m)}` : `de ${monthName(m)}`);
const [CUR_Y, CUR_M] = CURRENT_PERIOD.split("-").map(Number);

const ACTIONS = [
  { id: "act:leave", label: "Poser un congé", hint: "Nouvelle demande de congé", icon: CalendarPlus, href: "/app/leave?new=1", keywords: "conge vacances absence repos", roles: ALL },
  { id: "act:attestation", label: "Faire une demande d'attestation", hint: "Attestation de travail ou de salaire", icon: FilePlus2, href: "/app/requests?new=attestation_travail", keywords: "attestation travail salaire document demande", roles: ALL },
  { id: "act:payroll", label: `Lancer la paie ${deMois(CUR_M)}`, hint: "Assistant de paie en 6 étapes", icon: Wallet, href: `/app/payroll/runs/new?period=${CURRENT_PERIOD}`, keywords: "paie bulletins salaires run calcul", roles: PAY },
  { id: "act:add-employee", label: "Ajouter un employé", hint: "Nouveau dossier salarié", icon: UserPlus, href: "/app/employees/new", keywords: "embauche nouveau salarie recrue creer", roles: ["admin", "hr"] },
  { id: "act:simulator", label: "Ouvrir le simulateur", hint: "Brut → net, coût employeur, what-if", icon: Calculator, href: "/app/payroll/simulator", keywords: "simulateur simulation irg net brut what if", roles: PAY },
  { id: "act:loan", label: "Demander une avance sur salaire", hint: "Prêts et avances", icon: HandCoins, href: "/app/loans?new=1", keywords: "avance pret acompte", roles: ALL },
  { id: "act:assistant", label: "Ouvrir l'assistant IA", hint: "Posez une question sur vos données", icon: Sparkles, action: "assistant", keywords: "assistant ia question aide", roles: ALL },
  { id: "act:theme", label: "Basculer thème clair / sombre", hint: "Apparence de l'interface", icon: SunMoon, action: "theme", keywords: "theme sombre clair dark mode apparence", roles: ALL },
  { id: "act:switch-role", label: "Changer de rôle", hint: "Retour au choix des personas", icon: ArrowLeftRight, href: "/demo", keywords: "role persona voir en tant que demo", roles: ALL },
  { id: "act:reset", label: "Réinitialiser les données", hint: "Revenir aux données de démonstration", icon: DatabaseBackup, action: "reset", keywords: "reset reinitialiser donnees demo", roles: ALL },
];

/** Static + employee commands visible by `role`. */
export function buildCommands({ role, employees = [], positions = [], myId = null }) {
  const posTitle = Object.fromEntries(positions.map((p) => [p.id, p.title]));
  const out = [];

  for (const g of navGroups) {
    for (const item of g.items) {
      if (!item.roles.includes(role)) continue;
      out.push({
        id: `nav:${item.href}`,
        group: "nav",
        label: item.label,
        hint: g.label,
        icon: item.icon,
        href: item.href,
        keywords: `${g.label} ${item.href.replace(/[/-]/g, " ")}`,
      });
    }
  }
  out.push(
    { id: "nav:/app/me", group: "nav", label: "Mon profil", hint: "Compte", icon: UserRound, href: "/app/me", keywords: "profil compte preferences" },
    { id: "nav:/app/notifications", group: "nav", label: "Notifications", hint: "Compte", icon: Bell, href: "/app/notifications", keywords: "notifications alertes cloche" },
  );

  for (const a of ACTIONS) if (a.roles.includes(role)) out.push({ ...a, group: "actions" });

  if (["admin", "hr", "manager", "accountant"].includes(role)) {
    for (const e of employees) {
      if (e.status === "sorti") continue;
      out.push({
        id: `emp:${e.id}`,
        group: "employees",
        label: fullName(e),
        hint: `${e.matricule} · ${posTitle[e.positionId] ?? "—"}`,
        employee: e,
        icon: UserRound,
        href: `/app/employees/${e.id}`,
        keywords: `${e.lastName} ${e.firstName} ${e.matricule} ${posTitle[e.positionId] ?? ""}`,
      });
    }
  } else if (myId) {
    const me = employees.find((e) => e.id === myId);
    if (me) out.push({ id: `emp:${me.id}`, group: "employees", label: fullName(me), hint: `${me.matricule} · mon profil`, employee: me, icon: UserRound, href: "/app/me", keywords: `${me.lastName} ${me.firstName}` });
  }
  return out;
}

function scoreItem(q, item) {
  return Math.max(fuzzyScore(q, item.label), fuzzyScore(q, item.keywords ?? "") * 0.85, fuzzyScore(q, item.hint ?? "") * 0.6);
}

// Natural-language verbs: "congé Sofiane", "attestation Nadia", "paie", "bulletin septembre"
function smartCommands(query, { role, employees, positions }) {
  const n = normalize(query);
  const [verb, ...restWords] = n.split(" ");
  const rest = restWords.join(" ");
  const out = [];
  const people = (limit = 3) => (rest ? findEmployees(rest, employees.filter((e) => e.status !== "sorti"), positions).filter((r) => r.score >= 40).slice(0, limit) : []);
  const canSeePeople = ["admin", "hr", "manager", "accountant"].includes(role);

  if (/^(conges?|absence|vacances|poser)$/.test(verb) || (verb === "pose" && restWords[0] === "conge")) {
    const days = rest.match(/\b(\d{1,2})\s*j(?:ours?)?\b/);
    const nameQuery = rest.replace(/\b\d{1,2}\s*j(?:ours?)?\b/, "").replace(/^conges?\s+/, "").trim();
    const matches = nameQuery && canSeePeople ? findEmployees(nameQuery, employees.filter((e) => e.status !== "sorti"), positions).filter((r) => r.score >= 40).slice(0, 3) : [];
    for (const { employee } of matches) {
      out.push({
        id: `smart:leave:${employee.id}`, group: "smart", label: `Poser un congé pour ${fullName(employee)}`,
        hint: days ? `Pré-rempli : ${days[1]} jours` : "Ouvre le formulaire pré-rempli", icon: CalendarClock, employee,
        href: `/app/leave?new=1&employee=${employee.id}${days ? `&days=${days[1]}` : ""}`,
      });
    }
    if (!matches.length) out.push({ id: "smart:leave", group: "smart", label: "Poser un congé", hint: "Ouvre le formulaire de demande", icon: CalendarPlus, href: `/app/leave?new=1${days ? `&days=${days[1]}` : ""}` });
  }

  if (/^attestations?$/.test(verb)) {
    const kind = /salaire/.test(rest) ? "attestation_salaire" : "attestation_travail";
    const kindLabel = kind === "attestation_salaire" ? "d'attestation de salaire" : "d'attestation de travail";
    const matches = canSeePeople ? people() : [];
    for (const { employee } of matches) {
      out.push({
        id: `smart:att:${employee.id}`, group: "smart", label: `Demande ${kindLabel} · ${fullName(employee)}`,
        hint: "Pré-rempli pour cette personne", icon: FilePlus2, employee,
        href: `/app/requests?new=${kind}&employee=${employee.id}`,
      });
    }
    if (!matches.length) out.push({ id: "smart:att", group: "smart", label: `Demande ${kindLabel}`, hint: "Pour vous-même", icon: FilePlus2, href: `/app/requests?new=${kind}` });
  }

  if (/^(paie|paye|payer|salaires?)$/.test(verb) && PAY.includes(role)) {
    const m = parseMonth(rest);
    const period = m?.period ?? CURRENT_PERIOD;
    const label = deMois(Number(period.slice(5)));
    out.push({ id: `smart:payrun:${period}`, group: "smart", label: `Lancer la paie ${label}`, hint: "Assistant de paie", icon: Wallet, href: `/app/payroll/runs/new?period=${period}` });
    out.push({ id: "smart:payhome", group: "smart", label: "Ouvrir la paie", hint: "Historique des campagnes", icon: Wallet, href: "/app/payroll" });
  }

  if (/^(bulletins?|fiche|payslips?)$/.test(verb)) {
    const m = parseMonth(rest);
    const [y, mm] = (m?.period ?? "2026-09").split("-").map(Number);
    out.push({ id: `smart:slip:${m?.period ?? "last"}`, group: "smart", label: `Bulletin de ${monthName(mm)} ${y}`, hint: m ? "Mes bulletins" : "Dernier bulletin disponible", icon: ReceiptText, href: `/app/payslips?period=${m?.period ?? "2026-09"}` });
  }

  if (/^(avance|pret|acompte)$/.test(verb)) {
    out.push({ id: "smart:loan", group: "smart", label: "Demander une avance sur salaire", hint: "Prêts et avances", icon: HandCoins, href: "/app/loans?new=1" });
  }

  if (/^(document|doc|contrat)s?$/.test(verb) && rest) {
    out.push({ id: "smart:doc", group: "smart", label: `Chercher « ${rest} » dans les documents`, hint: "Coffre de documents", icon: FolderOpen, href: `/app/documents?q=${encodeURIComponent(rest)}` });
  }
  return out;
}

/** Context group: commands about the employee currently on screen. */
function contextCommands(pathname, employees) {
  const m = pathname?.match(/^\/app\/employees\/([^/?]+)$/);
  if (!m || m[1] === "new" || m[1] === "import") return [];
  const e = employees.find((x) => x.id === m[1]);
  if (!e) return [];
  const name = fullName(e);
  return [
    { id: `ctx:leave:${e.id}`, group: "context", label: `Poser un congé pour ${name}`, hint: "Cette fiche", icon: CalendarPlus, href: `/app/leave?new=1&employee=${e.id}` },
    { id: `ctx:att:${e.id}`, group: "context", label: `Attestation de travail · ${name}`, hint: "Cette fiche", icon: FilePlus2, href: `/app/requests?new=attestation_travail&employee=${e.id}` },
    { id: `ctx:slips:${e.id}`, group: "context", label: `Bulletins de ${e.firstName}`, hint: "Cette fiche", icon: ReceiptText, href: `/app/employees/${e.id}?tab=pay` },
  ];
}

export const RECENT_KEY = "sirh:recent-commands";
export function loadRecents() {
  try {
    const v = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function pushRecent(id) {
  if (id.startsWith("smart:") || id.startsWith("ai:") || id.startsWith("ctx:")) return;
  try {
    const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, 6);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

/**
 * Returns { groups:[{key,label,items}], flat:[item…] } — flat keeps display order for keyboard navigation.
 */
export function searchCommands(query, { commands, role, employees, positions, recents = [], pathname = "" }) {
  const q = query.trim();
  const buckets = {};
  const add = (key, items) => {
    if (items.length) buckets[key] = [...(buckets[key] ?? []), ...items];
  };

  if (!q) {
    const byId = Object.fromEntries(commands.map((c) => [c.id, c]));
    add("context", contextCommands(pathname, employees));
    add("recent", recents.map((id) => byId[id]).filter(Boolean).map((c) => ({ ...c, group: "recent" })));
    add("actions", commands.filter((c) => c.group === "actions" && !recents.includes(c.id)));
    add("nav", commands.filter((c) => c.group === "nav" && !recents.includes(c.id)).slice(0, 6));
  } else {
    add("context", contextCommands(pathname, employees).map((c) => ({ ...c, score: scoreItem(q, c) })).filter((c) => c.score >= 40));
    add("smart", smartCommands(q, { role, employees, positions }));
    for (const key of ["actions", "nav", "employees"]) {
      const scored = commands
        .filter((c) => c.group === key)
        .map((c) => ({ ...c, score: scoreItem(q, c) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score);
      add(key, scored);
    }
    add("ai", [{ id: "ai:search", group: "ai", label: `Rechercher « ${q} » partout`, hint: "Employés, documents, demandes", icon: Search, href: `/app/search?q=${encodeURIComponent(q)}` }, { id: "ai:ask", group: "ai", label: `Demander à l'assistant : « ${q} »`, hint: "Réponse basée sur vos données", icon: Sparkles, action: "assistant", question: q }]);
  }

  const groups = GROUP_ORDER.filter((k) => buckets[k]?.length).map((key) => ({ key, label: GROUP_LABELS[key], items: buckets[key].slice(0, GROUP_LIMIT[key]) }));
  return { groups, flat: groups.flatMap((g) => g.items) };
}
