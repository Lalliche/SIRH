import { db, getState, newId } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { addDays, diffDays, weekday, workingDays } from "@/lib/dates";
import { computePayslip, defaultParams, grossToNet, netToGross } from "@/lib/payroll";
import { dateShort, fullName, int, money, monthName, percent } from "@/lib/format";
import { LEAVE_TYPES, REQUEST_KINDS } from "@/data/constants";
import { can } from "@/lib/session";
import { mentionedEmployees, mentionsSelf, monthFromKey, monthRegexSource, normalize } from "@/lib/commands";

// Rule-based HR assistant: an intent router over getState(). No network, no LLM.
// Every answer is { text, list?, sources[], action?, followUps? } — sources link to the records used,
// write actions are returned as an `action` the UI must confirm before executeAction() touches the db.

export const ASSISTANT_LABEL = "Assistant SIRH — démo (réponses basées sur vos données)";

const SUGGESTIONS_STAFF = [
  "Qui est en congé la semaine prochaine ?",
  "Coût employeur de la production ?",
  "Combien de congés restent à Sofiane ?",
  "Qui a un contrat qui se termine bientôt ?",
  "Quel est le net pour 90 000 DA brut ?",
  "Absences cette semaine",
  "Génère une attestation de travail pour Nadia Saadi",
];
const SUGGESTIONS_MANAGER = [
  "Qui est en congé la semaine prochaine ?",
  "Qu'ai-je à valider ?",
  "Absences cette semaine",
  "Qui a un contrat qui se termine bientôt ?",
  "Combien de congés restent à Sofiane ?",
  "Quel est le net pour 90 000 DA brut ?",
];
const SUGGESTIONS_EMPLOYEE = [
  "Combien de congés me reste-t-il ?",
  "Pose un congé du 9 au 12 novembre",
  "Génère une attestation de travail pour moi",
  "Quel est le net pour 90 000 DA brut ?",
  "Qui est en congé cette semaine ?",
];

export function getSuggestions(role) {
  if (role === "employee") return SUGGESTIONS_EMPLOYEE;
  if (role === "manager") return SUGGESTIONS_MANAGER;
  return SUGGESTIONS_STAFF;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const ACTIVE = (e) => e.status !== "sorti";
const empLink = (e, tab) => `/app/employees/${e.id}${tab ? `?tab=${tab}` : ""}`;
const empSource = (e, tab, prefix = "") => ({ label: `${prefix}${fullName(e)}`, href: empLink(e, tab) });

const STOP = new Set(["et", "de", "des", "du", "la", "le", "les", "d", "l", "generale"]);
const DEPT_SYNONYMS = {
  "dep-prod": ["production", "usine", "atelier", "ligne"],
  "dep-rh": ["rh", "ressources humaines"],
  "dep-fin": ["finance", "comptabilite", "compta"],
  "dep-com": ["commercial", "commerciale", "ventes", "vente"],
  "dep-it": ["informatique", "systemes", "si"],
  "dep-log": ["logistique", "transport", "stock"],
  "dep-qual": ["qualite", "securite", "hse"],
  "dep-dir": ["direction"],
};
const ENTITY_SYNONYMS = {
  "ent-1": ["siege", "hydra"],
  "ent-2": ["usine", "rouiba"],
  "ent-3": ["oran", "agence"],
  "ent-4": ["setif", "plateforme"],
};

function hasWord(n, w) {
  return new RegExp(`(^| )${w}( |$)`).test(n);
}

function findScope(n, state) {
  // department first ("production"), then entity ("l'usine", "Oran")
  for (const d of state.departments) {
    const names = [...(DEPT_SYNONYMS[d.id] ?? []), ...normalize(d.name).split(" ").filter((w) => w.length > 2 && !STOP.has(w))];
    if (names.some((w) => hasWord(n, w))) {
      if (d.id === "dep-prod" && hasWord(n, "usine")) continue; // "usine" = site, not the department
      return { kind: "department", id: d.id, label: d.name, filter: (e) => e.departmentId === d.id, href: `/app/employees?department=${d.id}` };
    }
  }
  for (const en of state.entities) {
    const names = [...(ENTITY_SYNONYMS[en.id] ?? []), ...normalize(en.name).split(" ").filter((w) => w.length > 3)];
    if (names.some((w) => hasWord(n, w))) return { kind: "entity", id: en.id, label: en.name, filter: (e) => e.entityId === en.id, href: `/app/employees?entity=${en.id}` };
  }
  return null;
}

function weekBounds(offset = 0) {
  const start = addDays(TODAY, -weekday(TODAY) + 7 * offset); // Sunday
  return { start, end: addDays(start, 4) }; // → Thursday
}

function parsePeriod(n) {
  if (/semaine (prochaine|suivante)|la semaine d apres/.test(n)) return { ...weekBounds(1), label: "la semaine prochaine" };
  if (/(cette|la) semaine|semaine en cours/.test(n)) return { ...weekBounds(0), label: "cette semaine" };
  if (/aujourd ?hui|ce jour/.test(n)) return { start: TODAY, end: TODAY, label: "aujourd'hui" };
  if (/demain/.test(n)) return { start: addDays(TODAY, 1), end: addDays(TODAY, 1), label: "demain" };
  if (/mois prochain/.test(n)) {
    const [y, m] = TODAY.split("-").map(Number);
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    const start = `${ny}-${String(nm).padStart(2, "0")}-01`;
    return { start, end: addDays(`${ny}-${String(nm).padStart(2, "0")}-28`, 3), label: `${monthName(nm)} ${ny}` };
  }
  if (/ce mois/.test(n)) return { start: `${TODAY.slice(0, 7)}-01`, end: `${TODAY.slice(0, 7)}-31`, label: "ce mois-ci" };
  return { ...weekBounds(0), label: "cette semaine", defaulted: true };
}

function rangeLabel({ start, end }) {
  return start === end ? dateShort(start) : `${dateShort(start)} → ${dateShort(end)}`;
}

/** Visible people for a role: managers see their team, employees only themselves. */
function scopeEmployees(state, ctx) {
  const all = state.employees.filter(ACTIVE);
  if (["admin", "hr", "accountant"].includes(ctx.role)) return all;
  if (ctx.role === "manager") return all.filter((e) => e.managerId === ctx.employeeId || e.id === ctx.employeeId);
  return all.filter((e) => e.id === ctx.employeeId);
}

function resolveTarget(question, state, ctx) {
  const emps = state.employees;
  const mentions = mentionedEmployees(question, emps);
  if (mentions.length) {
    const best = mentions[0].score;
    const top = mentions.filter((m) => m.score === best).map((m) => m.employee);
    if (top.length === 1) return { employee: top[0] };
    const active = top.filter(ACTIVE);
    if (active.length === 1) return { employee: active[0] };
    // homonyms (same full name): keep the first record and say so; different people: ask
    const sameName = new Set(active.map((e) => normalize(fullName(e)))).size === 1;
    if (sameName) return { employee: active[0], homonyms: active.length };
    return { ambiguous: active.slice(0, 4) };
  }
  if (mentionsSelf(question)) return { employee: emps.find((e) => e.id === ctx.employeeId) ?? null, self: true };
  return { employee: null };
}

const homonymNote = (tgt, state) => {
  if (!tgt.homonyms) return "";
  const e = tgt.employee;
  const pos = state.positions.find((p) => p.id === e.positionId)?.title;
  return `\n${tgt.homonyms} homonymes dans l'entreprise : j'ai retenu le dossier ${e.matricule}${pos ? ` (${pos})` : ""}.`;
};

const params = (state) => state.settings?.payroll ?? defaultParams;

function parseAmounts(raw) {
  const out = [];
  const re = /\d[\d\s  .,]*\d|\d/g;
  let m;
  while ((m = re.exec(raw))) {
    let s = m[0].replace(/[\s  ]/g, "");
    if (/\.\d{3}(\D|$)/.test(s) && !/,/.test(s)) s = s.replace(/\./g, "");
    else if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(",", ".");
    let value = Number(s);
    const after = raw.slice(m.index + m[0].length);
    if (/^\s?k\b/i.test(after)) value *= 1000;
    if (Number.isFinite(value)) out.push({ value, after: normalize(after).slice(0, 24), index: m.index });
  }
  return out;
}

function parseDateRange(n) {
  const [ty] = TODAY.split("-").map(Number);
  const mk = (d, m, y) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const fixYear = (d, m, explicit) => {
    const y = explicit ? Number(explicit) : ty;
    const iso = mk(d, m, y);
    return !explicit && iso < TODAY ? mk(d, m, y + 1) : iso;
  };
  const M = monthRegexSource;
  let r = n.match(new RegExp(`du (\\d{1,2})(?: (${M}))? au (\\d{1,2}) (${M})(?: (20\\d{2}))?`));
  if (r) {
    const m2 = monthFromKey(r[4]);
    const m1 = r[2] ? monthFromKey(r[2]) : m2;
    return { from: fixYear(Number(r[1]), m1, r[5]), to: fixYear(Number(r[3]), m2, r[5]) };
  }
  r = n.match(/du (\d{1,2}) (\d{1,2}) au (\d{1,2}) (\d{1,2})(?: (20\d{2}))?/);
  if (r) return { from: fixYear(Number(r[1]), Number(r[2]), r[5]), to: fixYear(Number(r[3]), Number(r[4]), r[5]) };
  r = n.match(new RegExp(`(?:le |pour le )(\\d{1,2}) (${M})(?: (20\\d{2}))?`));
  if (r) {
    const iso = fixYear(Number(r[1]), monthFromKey(r[2]), r[3]);
    return { from: iso, to: iso };
  }
  if (/\bdemain\b/.test(n)) return { from: addDays(TODAY, 1), to: addDays(TODAY, 1) };
  return null;
}

// ---------------------------------------------------------------------------
// intents
// ---------------------------------------------------------------------------

const refusal = (text, extra = {}) => ({ text, sources: [], ...extra });
const NEED_SALARY = "Les données de rémunération sont réservées à la direction, aux RH et à la paie. Je peux en revanche calculer un net à partir d'un brut : essayez « Quel est le net pour 90 000 DA brut ? ».";

function intentNetCalc(raw, n, state) {
  const nums = parseAmounts(raw).filter((a) => a.value >= 1000);
  if (!nums.length) return null;
  const p = params(state);
  const hit = nums.find((a) => /^(da|dzd|dinars?)?\s*(de |en )?(net)\b/.test(a.after)) ?? null;
  const reverse = !!hit && !/brut/.test(n.slice(hit.index + 1).split("net")[0] ?? "");
  const value = (hit ?? nums[0]).value;
  const sim = (g) => `/app/payroll/simulator?gross=${Math.round(g)}`;

  if (reverse) {
    const gross = netToGross(value, p);
    const r = grossToNet(gross, p);
    return {
      text: `Pour un **net de ${money(value)}**, il faut un **brut d'environ ${money(gross)}**.\nCela représente ${money(r.cnasEmployee)} de cotisations salariales (CNAS ${percent(p.cnasEmployee * 100, 0)}) et ${money(r.irg)} d'IRG. Coût employeur total : **${money(r.employerCost)}**.`,
      sources: [{ label: "Simulateur de paie", href: sim(gross) }],
      followUps: [`Quel est le net pour ${int(Math.round(gross))} DA brut ?`],
      footnote: "Calcul sur un salaire seul, sans primes. Taux et barème IRG paramétrés — à confirmer.",
    };
  }
  const r = grossToNet(value, p);
  return {
    text: `Pour un **brut de ${money(value)}**, le **net à payer est d'environ ${money(r.net)}**.\nRetenue CNAS (${percent(p.cnasEmployee * 100, 0)}) : ${money(r.cnasEmployee)}. Base imposable : ${money(r.taxable)}. IRG : ${money(r.irg)}.\nPour l'employeur, le coût total ressort à **${money(r.employerCost)}** (cotisations patronales ${money(r.cnasEmployer)}).`,
    sources: [{ label: "Simulateur de paie", href: sim(value) }, { label: "Barème et taux", href: "/app/payroll/settings" }],
    followUps: [`Quel brut pour ${int(Math.round(r.net + 10000))} DA net ?`],
    footnote: "Calcul sur un salaire seul, sans primes. Taux et barème IRG paramétrés — à confirmer.",
  };
}

function intentAttestation(question, n, state, ctx) {
  const salary = /salaire|remuneration/.test(n);
  const kind = salary ? "attestation_salaire" : "attestation_travail";
  const tgt = resolveTarget(question, state, ctx);
  if (tgt.ambiguous) return disambiguate(tgt.ambiguous, (e) => `Génère une ${REQUEST_KINDS[kind].toLowerCase()} pour ${fullName(e)}`);
  const employee = tgt.employee ?? state.employees.find((e) => e.id === ctx.employeeId);
  if (!employee) return refusal("Pour quelle personne dois-je préparer l'attestation ?");
  const isSelf = employee.id === ctx.employeeId;
  if (!isSelf && !["admin", "hr"].includes(ctx.role)) {
    return refusal("Seuls les RH et la direction peuvent établir une attestation pour un autre salarié. Vous pouvez en demander une pour vous-même : « Génère une attestation de travail pour moi ».");
  }
  if (salary && !isSelf && !can(ctx.role, "salaries")) return refusal(NEED_SALARY);
  const generateNow = ["admin", "hr"].includes(ctx.role);
  const name = fullName(employee);
  const lines = generateNow
    ? [
        `${REQUEST_KINDS[kind]} au nom de ${name} (${employee.matricule})`,
        "Document PDF enregistré dans le coffre « Dossiers salariés »",
        "Demande tracée comme traitée, avec entrée dans le journal d'audit",
      ]
    : [`Demande d'${REQUEST_KINDS[kind].toLowerCase()} pour ${name}`, "Envoyée aux RH pour traitement (délai habituel : 48 h)"];
  return {
    text: generateNow
      ? `Je peux établir cette ${REQUEST_KINDS[kind].toLowerCase()} pour **${name}**. Voici ce qui sera enregistré, rien n'est écrit tant que vous n'avez pas confirmé.${homonymNote(tgt, state)}`
      : `Je peux déposer votre demande d'**${REQUEST_KINDS[kind].toLowerCase()}**. Confirmez pour l'envoyer aux RH.`,
    sources: [empSource(employee, "overview", "Dossier · ")],
    action: { kind: "attestation", title: generateNow ? "Générer le document" : "Envoyer la demande", confirmLabel: generateNow ? "Générer l'attestation" : "Envoyer la demande", lines, payload: { employeeId: employee.id, requestKind: kind, generate: generateNow } },
  };
}

function intentPoseLeave(question, n, state, ctx) {
  const range = parseDateRange(n);
  const tgt = resolveTarget(question, state, ctx);
  if (tgt.ambiguous) return disambiguate(tgt.ambiguous, (e) => `Pose un congé pour ${fullName(e)} ${question.replace(/^.*?(du .*)$/i, "$1")}`);
  const employee = tgt.employee ?? state.employees.find((e) => e.id === ctx.employeeId);
  if (!employee) return refusal("Pour qui dois-je poser ce congé ?");
  if (employee.id !== ctx.employeeId && !["admin", "hr"].includes(ctx.role)) {
    return refusal("Vous pouvez poser un congé pour vous-même ; les RH le font pour les autres salariés.");
  }
  if (!range) {
    return {
      text: "Quelles sont les dates ? Dites-le comme dans « Pose un congé du 9 au 12 novembre », ou ouvrez le formulaire complet.",
      sources: [{ label: "Formulaire de congé", href: `/app/leave?new=1${employee.id !== ctx.employeeId ? `&employee=${employee.id}` : ""}` }],
      followUps: ["Pose un congé du 9 au 12 novembre"],
    };
  }
  if (range.to < range.from) return refusal("La date de fin précède la date de début. Pouvez-vous reformuler les dates ?");
  const days = workingDays(range.from, range.to);
  if (days === 0) return refusal(`Du ${dateShort(range.from)} au ${dateShort(range.to)}, il n'y a aucun jour ouvré (week-end ou jours fériés).`);
  const type = /maladie|arret/.test(n) ? "sick" : /sans solde/.test(n) ? "unpaid" : /exceptionnel|mariage|deces/.test(n) ? "exceptional" : "annual";
  const clash = state.leaveRequests.find((l) => l.employeeId === employee.id && ["pending", "approved", "taken"].includes(l.status) && l.from <= range.to && l.to >= range.from);
  const balance = employee.leaveBalance?.annual ?? 0;
  const lines = [
    `${LEAVE_TYPES[type].label} pour ${fullName(employee)}`,
    `Du ${dateShort(range.from)} au ${dateShort(range.to)} : ${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""} (week-ends et jours fériés exclus)`,
    "Statut : en attente de validation du responsable",
  ];
  const warnings = [];
  if (clash) warnings.push(`Chevauche une demande existante (${dateShort(clash.from)} → ${dateShort(clash.to)}).`);
  if (type === "annual" && days > balance) warnings.push(`Solde annuel insuffisant : ${balance} jour${balance > 1 ? "s" : ""} disponible${balance > 1 ? "s" : ""}.`);
  return {
    text: `Voici la demande que je peux déposer pour **${fullName(employee)}** : ${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}, du ${dateShort(range.from)} au ${dateShort(range.to)}.${homonymNote(tgt, state)}`,
    sources: [empSource(employee, "leave", "Congés · ")],
    action: { kind: "leave", title: "Déposer la demande de congé", confirmLabel: "Déposer la demande", lines, warnings, payload: { employeeId: employee.id, type, from: range.from, to: range.to, days } },
  };
}

function disambiguate(options, makeQuestion) {
  return {
    text: `Plusieurs personnes correspondent : **${options.map(fullName).join(", ")}**. Laquelle voulez-vous dire ?`,
    sources: options.map((e) => empSource(e)),
    followUps: options.map(makeQuestion),
  };
}

function intentLeaveBalance(question, state, ctx) {
  const tgt = resolveTarget(question, state, ctx);
  if (tgt.ambiguous) return disambiguate(tgt.ambiguous, (e) => `Combien de congés restent à ${fullName(e)} ?`);
  const employee = tgt.employee ?? state.employees.find((e) => e.id === ctx.employeeId);
  if (!employee) return refusal("De quelle personne parlez-vous ?");
  const visible = scopeEmployees(state, ctx).some((e) => e.id === employee.id);
  if (!visible) return refusal(ctx.role === "employee" ? "Je ne peux vous renseigner que sur vos propres congés." : "Cette personne ne fait pas partie de votre équipe : je ne peux pas afficher son solde.");
  const { annual = 0, taken = 0 } = employee.leaveBalance ?? {};
  const pending = state.leaveRequests.filter((l) => l.employeeId === employee.id && l.status === "pending");
  const pendingDays = pending.reduce((s, l) => s + l.days, 0);
  const next = state.leaveRequests
    .filter((l) => l.employeeId === employee.id && l.status === "approved" && l.to >= TODAY)
    .sort((a, b) => a.from.localeCompare(b.from))[0];
  const you = employee.id === ctx.employeeId;
  let text = `${you ? "Vous disposez" : `**${fullName(employee)}** dispose`} de **${annual} jour${annual > 1 ? "s" : ""} de congé annuel** (${taken} déjà pris cette année).`;
  if (pending.length) text += `\n${pending.length} demande${pending.length > 1 ? "s" : ""} en attente (${pendingDays} jour${pendingDays > 1 ? "s" : ""}) : le solde après validation serait de ${Math.max(0, annual - pendingDays)} jour${annual - pendingDays > 1 ? "s" : ""}.`;
  if (next) text += `\nProchain congé approuvé : du ${dateShort(next.from)} au ${dateShort(next.to)}.`;
  return {
    text: text + homonymNote(tgt, state),
    sources: [empSource(employee, "leave", "Congés · "), { label: "Demandes de congé", href: "/app/leave/requests" }],
  };
}

function intentWhoOnLeave(n, state) {
  const period = parsePeriod(n);
  const people = new Map(state.employees.map((e) => [e.id, e]));
  const hits = state.leaveRequests
    .filter((l) => ["approved", "taken"].includes(l.status) && l.from <= period.end && l.to >= period.start)
    .filter((l) => people.get(l.employeeId) && ACTIVE(people.get(l.employeeId)))
    .sort((a, b) => a.from.localeCompare(b.from));
  const pending = state.leaveRequests.filter((l) => l.status === "pending" && l.from <= period.end && l.to >= period.start);
  const head = period.defaulted ? "Je regarde **cette semaine** par défaut. " : "";
  if (!hits.length) {
    return {
      text: `${head}Personne n'est en congé approuvé ${period.label} (${rangeLabel(period)}).${pending.length ? ` ${pending.length} demande${pending.length > 1 ? "s" : ""} en attente concerne${pending.length > 1 ? "nt" : ""} cette période.` : ""}`,
      sources: [{ label: "Calendrier des congés", href: "/app/leave/calendar" }],
    };
  }
  return {
    text: `${head}**${hits.length} personne${hits.length > 1 ? "s sont" : " est"} en congé ${period.label}** (${rangeLabel(period)})${pending.length ? `, plus ${pending.length} demande${pending.length > 1 ? "s" : ""} en attente sur la période` : ""}.`,
    list: hits.map((l) => {
      const e = people.get(l.employeeId);
      return { title: fullName(e), detail: `${LEAVE_TYPES[l.type]?.label ?? l.type} · ${dateShort(l.from)} → ${dateShort(l.to)}`, href: empLink(e, "leave"), employee: e };
    }),
    sources: [{ label: "Calendrier des congés", href: "/app/leave/calendar" }, { label: "Toutes les demandes", href: "/app/leave/requests" }],
  };
}

function intentAbsences(n, state) {
  const period = parsePeriod(n);
  const end = period.end > TODAY ? TODAY : period.end;
  const people = new Map(state.employees.map((e) => [e.id, e]));
  const rows = state.attendance.filter((a) => a.date >= period.start && a.date <= end);
  const absent = new Map();
  for (const a of rows.filter((r) => r.status === "absent")) absent.set(a.employeeId, [...(absent.get(a.employeeId) ?? []), a.date]);
  const late = rows.filter((r) => r.status === "late").length;
  const onLeave = new Set(rows.filter((r) => r.status === "leave").map((r) => r.employeeId));
  const list = [...absent.entries()].map(([id, dates]) => {
    const e = people.get(id);
    return { title: fullName(e), detail: `${dates.length} jour${dates.length > 1 ? "s" : ""} d'absence : ${dates.map(dateShort).join(", ")}`, href: empLink(e, "time"), employee: e };
  });
  const text = absent.size
    ? `**${absent.size} salarié${absent.size > 1 ? "s" : ""} absent${absent.size > 1 ? "s" : ""}** (non justifié) ${period.label}, jusqu'à aujourd'hui. À côté de cela : ${onLeave.size} en congé et ${late} retard${late > 1 ? "s" : ""} enregistré${late > 1 ? "s" : ""}.`
    : `Aucune absence non justifiée ${period.label}. ${onLeave.size} personne${onLeave.size > 1 ? "s sont" : " est"} en congé et ${late} retard${late > 1 ? "s ont" : " a"} été enregistré${late > 1 ? "s" : ""}.`;
  return { text, list: list.slice(0, 8), sources: [{ label: "Tableau de pointage", href: "/app/attendance" }, { label: "Calendrier des congés", href: "/app/leave/calendar" }] };
}

function intentEmployerCost(n, state, ctx) {
  if (!can(ctx.role, "salaries")) return refusal(NEED_SALARY);
  const scope = findScope(n, state);
  const p = params(state);
  const team = state.employees.filter(ACTIVE).filter((e) => (scope ? scope.filter(e) : true));
  if (!team.length) return refusal("Je ne trouve aucun salarié actif dans ce périmètre.");
  const slips = team.map((e) => ({ e, s: computePayslip({ baseSalary: e.baseSalary, components: e.components }, p) }));
  const cost = slips.reduce((t, x) => t + x.s.employerCost, 0);
  const gross = slips.reduce((t, x) => t + x.s.gross, 0);
  const charges = slips.reduce((t, x) => t + x.s.cnasEmployer + x.s.fnpos, 0);
  const top = [...slips].sort((a, b) => b.s.employerCost - a.s.employerCost).slice(0, 3);
  const label = scope ? scope.label : "toute l'entreprise";
  return {
    text: `Le **coût employeur mensuel — ${label}** s'élève à **${money(cost)}** pour ${int(team.length)} salarié${team.length > 1 ? "s" : ""}.\nMasse brute : ${money(gross)} + cotisations patronales (CNAS ${percent(p.cnasEmployer * 100, 0)}, FNPOS) : ${money(charges)}. Soit ${money(cost / team.length)} par salarié en moyenne.`,
    list: top.map(({ e, s }) => ({ title: fullName(e), detail: `Coût employeur ${money(s.employerCost)}`, href: empLink(e, "pay"), employee: e })),
    sources: [{ label: scope ? `Employés · ${scope.label}` : "Employés", href: scope?.href ?? "/app/employees" }, { label: "Rapport masse salariale", href: "/app/reports" }],
    followUps: scope ? ["Coût employeur total ?"] : ["Coût employeur de la production ?"],
    footnote: "Estimation sur salaire de base et indemnités du dossier, hors heures supplémentaires. Taux paramétrés — à confirmer.",
  };
}

function intentContracts(n, state, ctx) {
  if (!["admin", "hr", "manager"].includes(ctx.role)) return refusal("Le suivi des contrats est réservé aux RH, à la direction et aux responsables d'équipe.");
  const horizon = /3 mois|trois mois/.test(n) ? 90 : /30 jours|un mois|ce mois/.test(n) ? 30 : 60;
  const limit = addDays(TODAY, horizon);
  const scope = scopeEmployees(state, ctx);
  const ending = scope
    .filter((e) => e.contract?.endDate && e.contract.endDate >= TODAY && e.contract.endDate <= limit)
    .sort((a, b) => a.contract.endDate.localeCompare(b.contract.endDate));
  const trial = scope.filter((e) => e.contract?.trialEnd && e.contract.trialEnd >= TODAY && e.contract.trialEnd <= addDays(TODAY, 30));
  const text = ending.length
    ? `**${ending.length} contrat${ending.length > 1 ? "s se terminent" : " se termine"}** dans les ${horizon} prochains jours.${trial.length ? ` ${trial.length} fin${trial.length > 1 ? "s" : ""} de période d'essai à signaler ce mois-ci.` : ""} Pensez à décider du renouvellement avant l'échéance.`
    : `Aucun contrat n'arrive à échéance dans les ${horizon} prochains jours.${trial.length ? ` ${trial.length} période${trial.length > 1 ? "s" : ""} d'essai se termine${trial.length > 1 ? "nt" : ""} ce mois-ci.` : ""}`;
  return {
    text,
    list: [
      ...ending.map((e) => ({ title: fullName(e), detail: `${e.contract.type} · fin le ${dateShort(e.contract.endDate)} (dans ${diffDays(TODAY, e.contract.endDate)} j)`, href: empLink(e, "contract"), employee: e })),
      ...trial.map((e) => ({ title: fullName(e), detail: `Fin de période d'essai le ${dateShort(e.contract.trialEnd)}`, href: empLink(e, "contract"), employee: e })),
    ].slice(0, 8),
    sources: [{ label: "Employés", href: "/app/employees" }, { label: "Documents à échéance", href: "/app/documents" }],
  };
}

function intentSalary(question, state, ctx) {
  if (!can(ctx.role, "salaries")) return refusal(NEED_SALARY);
  const tgt = resolveTarget(question, state, ctx);
  if (tgt.ambiguous) return disambiguate(tgt.ambiguous, (e) => `Quel est le salaire de ${fullName(e)} ?`);
  if (!tgt.employee) return refusal("De quelle personne souhaitez-vous connaître la rémunération ?");
  const e = tgt.employee;
  const s = computePayslip({ baseSalary: e.baseSalary, components: e.components }, params(state));
  db.audit(ctx.employeeId, "Salaire consulté", fullName(e), "Via l'assistant SIRH");
  return {
    text: `**${fullName(e)}** : salaire de base **${money(e.baseSalary)}**, brut mensuel ${money(s.gross)} avec indemnités, **net estimé ${money(s.net)}**.\nCette consultation a été enregistrée dans le journal d'audit.${homonymNote(tgt, state)}`,
    sources: [empSource(e, "pay", "Paie · "), { label: "Journal d'audit", href: "/app/settings/audit-log" }],
  };
}

function intentHeadcount(n, state) {
  const active = state.employees.filter(ACTIVE);
  const byEntity = state.entities.map((en) => ({ en, count: active.filter((e) => e.entityId === en.id).length })).filter((x) => x.count);
  const scope = findScope(n, state);
  if (scope) {
    const count = active.filter(scope.filter).length;
    return { text: `**${int(count)} salarié${count > 1 ? "s" : ""}** actif${count > 1 ? "s" : ""} — ${scope.label}.`, sources: [{ label: `Employés · ${scope.label}`, href: scope.href }] };
  }
  return {
    text: `L'effectif actif est de **${int(active.length)} salariés** sur ${byEntity.length} sites.`,
    list: byEntity.map(({ en, count }) => ({ title: en.name, detail: `${int(count)} salarié${count > 1 ? "s" : ""}`, href: `/app/employees?entity=${en.id}` })),
    sources: [{ label: "Annuaire des employés", href: "/app/employees" }, { label: "Organigramme", href: "/app/org-chart" }],
  };
}

function intentPending(state, ctx) {
  if (!["admin", "hr", "manager"].includes(ctx.role)) return refusal("Il n'y a rien à valider pour votre rôle. Vous pouvez suivre vos propres demandes depuis la page Demandes.", { sources: [{ label: "Mes demandes", href: "/app/requests" }] });
  const team = new Set(scopeEmployees(state, ctx).map((e) => e.id));
  const byId = new Map(state.employees.map((e) => [e.id, e]));
  const leave = state.leaveRequests.filter((l) => l.status === "pending" && (ctx.role !== "manager" || team.has(l.employeeId)));
  const reqs = state.requests.filter((r) => r.status === "pending" && (ctx.role !== "manager" || team.has(r.employeeId)));
  const loans = ctx.role === "manager" ? [] : state.loans.filter((l) => l.status === "pending");
  const total = leave.length + reqs.length + loans.length;
  if (!total) return { text: "Rien en attente : votre boîte d'approbations est vide.", sources: [{ label: "Approbations", href: "/app/inbox" }] };
  const list = [
    ...leave.map((l) => ({ title: fullName(byId.get(l.employeeId)), detail: `Congé · ${dateShort(l.from)} → ${dateShort(l.to)} (${l.days} j)`, href: "/app/inbox", employee: byId.get(l.employeeId) })),
    ...reqs.map((r) => ({ title: fullName(byId.get(r.employeeId)), detail: REQUEST_KINDS[r.kind] ?? r.kind, href: "/app/inbox", employee: byId.get(r.employeeId) })),
    ...loans.map((l) => ({ title: fullName(byId.get(l.employeeId)), detail: `Avance · ${money(l.total)}`, href: "/app/inbox", employee: byId.get(l.employeeId) })),
  ].slice(0, 6);
  return {
    text: `**${total} élément${total > 1 ? "s" : ""} à traiter** : ${leave.length} congé${leave.length > 1 ? "s" : ""}, ${reqs.length} demande${reqs.length > 1 ? "s" : ""} de documents ou matériel${loans.length ? `, ${loans.length} avance${loans.length > 1 ? "s" : ""}` : ""}.`,
    list,
    sources: [{ label: "Boîte d'approbations", href: "/app/inbox" }],
  };
}

function intentPayroll(state, ctx) {
  if (!can(ctx.role, "payroll")) return refusal("Les campagnes de paie sont réservées à la direction, aux RH et à la paie.");
  const runs = [...state.payrollRuns].sort((a, b) => a.period.localeCompare(b.period));
  const last = runs[runs.length - 1];
  if (!last) return refusal("Aucune campagne de paie n'a encore été calculée.");
  const [y, m] = last.period.split("-").map(Number);
  return {
    text: `La dernière paie est celle de **${monthName(m)} ${y}** (${last.status === "paid" ? "payée" : last.status}) : **${int(last.headcount)} bulletins**, brut ${money(last.totals.gross)}, net à payer ${money(last.totals.net)}, coût employeur ${money(last.totals.employerCost)}.\nLa paie d'octobre n'est pas encore lancée : les variables sont à saisir avant le 5 novembre.`,
    sources: [{ label: `Campagne ${monthName(m)} ${y}`, href: `/app/payroll/runs/${last.id}` }, { label: "Lancer la paie d'octobre", href: "/app/payroll/runs/new?period=2026-10" }],
  };
}

function intentDataQuality(state, ctx) {
  if (!["admin", "hr"].includes(ctx.role)) return refusal("Le contrôle des dossiers est réservé aux RH et à la direction.");
  const p = params(state);
  const missingCnas = state.employees.filter((e) => ACTIVE(e) && !e.cnasNumber);
  const belowSnmg = state.employees.filter((e) => ACTIVE(e) && e.baseSalary < p.snmg);
  const total = missingCnas.length + belowSnmg.length;
  if (!total) return { text: "Tous les dossiers sont complets et conformes au SNMG.", sources: [{ label: "Employés", href: "/app/employees" }] };
  return {
    text: `**${total} anomalie${total > 1 ? "s" : ""}** à corriger avant la paie : ${missingCnas.length} numéro${missingCnas.length > 1 ? "s" : ""} CNAS manquant${missingCnas.length > 1 ? "s" : ""}, ${belowSnmg.length} salaire${belowSnmg.length > 1 ? "s" : ""} inférieur${belowSnmg.length > 1 ? "s" : ""} au SNMG (${money(p.snmg)}).`,
    list: [
      ...missingCnas.map((e) => ({ title: fullName(e), detail: "N° CNAS manquant", href: empLink(e, "overview"), employee: e })),
      ...belowSnmg.map((e) => ({ title: fullName(e), detail: `Salaire de base ${money(e.baseSalary)} < SNMG`, href: empLink(e, "pay"), employee: e })),
    ],
    sources: [{ label: "Pré-contrôle de paie", href: "/app/payroll" }, { label: "Conformité", href: "/app/compliance" }],
  };
}

function help(ctx) {
  const examples = getSuggestions(ctx.role).slice(0, 5);
  return {
    text: "Je n'ai pas bien compris. Je réponds à partir de vos données : congés, absences, contrats, coûts, calculs de paie, et je peux préparer certaines actions que vous confirmez avant enregistrement.\nEssayez par exemple :",
    sources: [],
    followUps: examples,
  };
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

/**
 * @param {string} question
 * @param {{role:string, employeeId:string}} ctx
 * @returns {{text:string, list?:Array, sources:Array, action?:object, followUps?:string[], footnote?:string}}
 */
function route(question, ctx) {
  const state = getState();
  const raw = question.trim();
  const n = normalize(raw);
  if (!n) return help(ctx);

  if (/^(bonjour|salut|bonsoir|coucou|hello|salam)\b/.test(n) && n.split(" ").length <= 3) {
    return { text: `Bonjour ! Je suis l'assistant SIRH. Demandez-moi un solde de congés, un coût employeur, un calcul brut → net, ou une attestation.`, sources: [], followUps: getSuggestions(ctx.role).slice(0, 4) };
  }
  if (/^(merci|super|parfait|top|ok merci)\b/.test(n)) return { text: "Avec plaisir. Je reste disponible si vous avez d'autres questions.", sources: [] };
  if (/^(aide|help|que sais tu faire|que peux tu faire|quoi demander)/.test(n)) return help(ctx);

  // write actions first (imperative verbs)
  if (/attestation/.test(n) && !/combien|qui |quelles?|liste|en attente/.test(n)) return intentAttestation(raw, n, state, ctx);
  if (/(pose|poser|deposer|depose|ajoute|ajouter|cree|creer|prends|prendre|demande|demander|reserve|je veux|je souhaite)\b.*\bconges?\b|\bconges?\b.*\bdu \d/.test(n) && !/combien|solde|reste|qui |est ce/.test(n)) return intentPoseLeave(raw, n, state, ctx);

  // computations
  if (/\b(brut|net)\b/.test(n) && /\d/.test(n) && !/(cout|masse|total)/.test(n)) {
    const r = intentNetCalc(raw, n, state);
    if (r) return r;
  }
  if (/cout|masse salariale|charges patronales|budget rh|couter/.test(n) && /employeur|masse|cout|charges|salarial/.test(n)) return intentEmployerCost(n, state, ctx);
  if (/salaire de |remuneration de |combien gagne|combien touche/.test(n)) return intentSalary(raw, state, ctx);
  if (/derniere paie|paie de |bulletins? du mois|campagne de paie|etat de la paie/.test(n)) return intentPayroll(state, ctx);

  // leave & time
  if (/combien.*(conges?|jours?)|solde.*conges?|conges? (restants?|restent|disponibles?)|reste.*conges?|jours? de conges?.*(reste|restant)/.test(n) && /restent?|reste|solde|disponibles?|restants?/.test(n)) return intentLeaveBalance(raw, state, ctx);
  if (/\babsen(ce|ces|ts?)\b|retards?|pointage/.test(n) && !/conges?/.test(n)) return intentAbsences(n, state);
  if (/conges?|vacances|en repos|absents? pour/.test(n) && /(qui|quels?|quelles?|liste|est en|sont en)/.test(n)) return intentWhoOnLeave(n, state);

  // people & contracts
  if (/contrats?|cdd|fin de periode d essai|essai/.test(n) && /(termine|fin|expire|echeance|bientot|arrive|renouvel)/.test(n)) return intentContracts(n, state, ctx);
  if (/a valider|en attente|a traiter|approbations?|a approuver|boite/.test(n)) return intentPending(state, ctx);
  if (/effectif|combien d employes|combien de salaries|nombre de salaries|nombre d employes|headcount/.test(n)) return intentHeadcount(n, state);
  if (/numero cnas|cnas manquant|dossiers? incomplets?|anomalies?|snmg|pre ?controle|verifie les dossiers/.test(n)) return intentDataQuality(state, ctx);

  // loose fallbacks
  if (/conges?/.test(n)) return mentionedEmployees(raw, state.employees).length || mentionsSelf(raw) ? intentLeaveBalance(raw, state, ctx) : intentWhoOnLeave(n, state);
  if (/\d/.test(n) && /(brut|net)/.test(n)) {
    const r = intentNetCalc(raw, n, state);
    if (r) return r;
  }
  return help(ctx);
}

export function answerQuestion(question, ctx) {
  const r = route(question, ctx);
  return { ...r, text: tidy(r.text) };
}

// "nov.." → "nov."
const tidy = (t) => t.replace(/\.\.(?!\.)/g, ".");

const nameShort = (e) => `${e.firstName[0]}. ${e.lastName}`;

/** Performs a confirmed write action. Returns { text, sources, toast }. */
export function executeAction(action, ctx) {
  const state = getState();
  const { payload } = action;
  const employee = state.employees.find((e) => e.id === payload.employeeId);
  if (!employee) return { text: "Je ne retrouve plus ce dossier : rien n'a été enregistré.", sources: [], toast: "Action annulée" };
  const name = fullName(employee);

  if (action.kind === "attestation") {
    const label = REQUEST_KINDS[payload.requestKind];
    const request = db.insert("requests", {
      id: newId("rq"),
      employeeId: employee.id,
      kind: payload.requestKind,
      status: payload.generate ? "approved" : "pending",
      note: "Créée via l'assistant SIRH",
      createdAt: TODAY,
      ...(payload.generate ? { decidedAt: TODAY } : {}),
    }, { prepend: true });
    if (payload.generate) {
      const doc = db.insert("documents", {
        id: newId("doc"),
        name: `${label} — ${nameShort(employee)}.pdf`,
        folder: "Dossiers salariés",
        kind: "pdf",
        size: 38000 + (name.length % 7) * 1900,
        uploadedAt: TODAY,
        expiresAt: null,
        ownerId: employee.id,
      }, { prepend: true });
      db.audit(ctx.employeeId, "Attestation générée", name, `${label} · via l'assistant`);
      return {
        text: `C'est fait : **${doc.name}** est disponible dans le coffre de documents, et la demande ${request.id} est marquée comme traitée.`,
        sources: [{ label: doc.name, href: "/app/documents" }, empSource(employee, "documents", "Dossier · ")],
        toast: `${label} générée pour ${name}`,
      };
    }
    db.notify({ title: `Demande d'${label.toLowerCase()}`, body: `${name} · créée via l'assistant`, href: "/app/inbox", roles: ["admin", "hr"] });
    db.audit(ctx.employeeId, "Demande créée", name, `${label} · via l'assistant`);
    return { text: `Votre demande d'**${label.toLowerCase()}** a été envoyée aux RH (réf. ${request.id}).`, sources: [{ label: "Mes demandes", href: "/app/requests" }], toast: "Demande envoyée aux RH" };
  }

  if (action.kind === "leave") {
    const leave = db.insert("leaveRequests", {
      id: newId("lv"),
      employeeId: employee.id,
      type: payload.type,
      from: payload.from,
      to: payload.to,
      days: payload.days,
      status: "pending",
      reason: "Posée via l'assistant SIRH",
      createdAt: TODAY,
      decidedBy: null,
      decidedAt: null,
    }, { prepend: true });
    db.notify({ title: "Nouvelle demande de congé", body: `${name} · ${payload.days} j du ${dateShort(payload.from)} au ${dateShort(payload.to)}`, href: "/app/inbox", roles: ["admin", "hr", "manager"] });
    db.audit(ctx.employeeId, "Congé demandé", name, `${dateShort(payload.from)} → ${dateShort(payload.to)} (${payload.days} j) · via l'assistant`);
    return {
      text: `La demande est déposée (réf. ${leave.id}) : **${payload.days} jour${payload.days > 1 ? "s" : ""}** du ${dateShort(payload.from)} au ${dateShort(payload.to)}. Elle apparaît maintenant dans la boîte d'approbations du responsable.`,
      sources: [{ label: "Demandes de congé", href: "/app/leave/requests" }, empSource(employee, "leave", "Congés · ")],
      toast: "Demande de congé déposée",
    };
  }
  return { text: "Cette action n'est pas prise en charge.", sources: [] };
}
