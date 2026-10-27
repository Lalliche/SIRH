// Landing > #mobile (self-service). The demo data is fictional.
import { CalendarCheck, FileDown, BellRing } from "lucide-react";

export const selfservice = {
  id: "mobile",
  eyebrow: "Espace salarié",
  title: "Les RH dans la poche de chaque salarié.",
  description:
    "Solde de congés, bulletins de paie, attestations : le salarié se sert seul, depuis son téléphone, sans appeler les RH ni attendre le papier.",
  bullets: [
    { icon: CalendarCheck, title: "Congés en trois touches", text: "Le solde est visible, les jours fériés et le week-end vendredi-samedi sont déjà décomptés." },
    { icon: FileDown, title: "Bulletins à la demande", text: "Chaque bulletin validé apparaît dans l'espace du salarié, téléchargeable en PDF." },
    { icon: BellRing, title: "Réponse suivie", text: "Le manager reçoit la demande, approuve ou refuse, et le salarié est notifié." },
  ],
  hint: "Essayez : touchez « Demander un congé ».",
  phone: {
    greeting: "Bonjour Amina",
    role: "Comptable · Alger",
    balanceLabel: "Solde de congés annuels",
    balance: 18,
    total: 30,
    unit: "jours",
    request: "Demander un congé",
    pendingBadge: "En attente",
    sheetTitle: "Nouvelle demande",
    sheetHint: "Choisissez une période. Week-end et jours fériés exclus.",
    confirm: "Envoyer la demande",
    cancel: "Annuler",
    payslipsTitle: "Mes bulletins",
    downloadLabel: "Télécharger",
    downloading: "Préparation…",
    downloaded: "Téléchargé",
    reset: "Rejouer la démo",
    manager: "Karim Benali",
    // Fictive periods (TODAY = 2026-10-27). Working days are computed with lib/dates (Fri+Sat off, holidays off).
    periods: [
      { id: "p1", from: "2026-11-02", to: "2026-11-05", label: "2 – 5 nov." },
      { id: "p2", from: "2026-11-08", to: "2026-11-12", label: "8 – 12 nov." },
      { id: "p3", from: "2026-12-20", to: "2026-12-31", label: "20 – 31 déc." },
    ],
    payslips: [
      { id: "s10", period: "Octobre 2026", net: 73800 },
      { id: "s09", period: "Septembre 2026", net: 73800 },
    ],
  },
};
