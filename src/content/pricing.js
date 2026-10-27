// Landing > #tarifs and /tarifs.
// [PLACEHOLDER] All prices are illustrative until the client supplies the commercial grid.
export const TVA_RATE = 0.19;
export const ANNUAL_MONTHS_BILLED = 10; // annual plan = 2 months free

export const pricing = {
  id: "tarifs",
  eyebrow: "Tarifs",
  title: "Des prix publics, en dinars, selon votre effectif.",
  description:
    "Pas de module caché ni de frais de reprise. Vous payez selon le nombre de salariés actifs, en dinars algériens, par les moyens que vous utilisez déjà.",
  billing: {
    label: "Périodicité de facturation",
    options: [
      { value: "monthly", label: "Mensuel" },
      { value: "yearly", label: "Annuel" },
    ],
    yearlyChip: "2 mois offerts",
  },
  tax: {
    label: "Affichage des prix",
    options: [
      { value: "ht", label: "HT" },
      { value: "ttc", label: "TTC" },
    ],
    note: "TVA 19 %",
  },
  unit: "DA / mois",
  perYear: "facturé {amount} par an",
  perMonthBilled: "facturé chaque mois",
  highlightBadge: "Le plus choisi",
  tiers: [
    {
      id: "essentiel",
      name: "Essentiel",
      range: "1 à 25 salariés",
      pitch: "Pour les petites structures qui quittent Excel.",
      monthlyHt: 15000, // [PLACEHOLDER]
      cta: "Demander une démo",
      features: [
        "Dossier salarié et documents",
        "Congés, absences et pointage",
        "Paie CNAS / IRG et bulletins PDF",
        "Espace salarié mobile",
        "Support par e-mail",
      ],
    },
    {
      id: "professionnel",
      name: "Professionnel",
      range: "26 à 100 salariés",
      pitch: "Pour les équipes RH qui veulent contrôler et déclarer sans stress.",
      monthlyHt: 36000, // [PLACEHOLDER]
      highlighted: true,
      cta: "Demander une démo",
      features: [
        "Tout Essentiel, plus :",
        "Déclarations G50 et DAS",
        "Contrôle avant paie et comparaison mensuelle",
        "Rôles, validations et journal d'audit",
        "Support téléphone et WhatsApp",
      ],
    },
    {
      id: "entreprise",
      name: "Entreprise",
      range: "101 à 500 salariés",
      pitch: "Pour les groupes, plusieurs entités et sites.",
      monthlyHt: 78000, // [PLACEHOLDER]
      cta: "Parler à un conseiller",
      features: [
        "Tout Professionnel, plus :",
        "Entités et sites multiples",
        "Double authentification imposée",
        "Reprise de données accompagnée",
        "Interlocuteur dédié",
      ],
    },
  ],
  beyond: "Plus de 500 salariés ? Nous établissons un devis sur mesure.",
  payment: {
    title: "Paiement simple, comme vous travaillez",
    methods: ["Virement", "Chèque", "CCP", "Baridimob"],
    note: "Facture proforma sur demande. Prix en dinars algériens, hors taxes sauf mention TTC.",
  },
  fine: "Tarifs indicatifs, susceptibles d'évoluer avant lancement.",
};

// Feature matrix for /tarifs. true / false / string per tier [essentiel, professionnel, entreprise]
export const pricingMatrix = {
  title: "Comparer les offres en détail",
  tierNames: ["Essentiel", "Professionnel", "Entreprise"],
  groups: [
    {
      name: "Ressources humaines",
      rows: [
        { label: "Salariés inclus", values: ["25", "100", "500"] },
        { label: "Dossier salarié, contrats et documents", values: [true, true, true] },
        { label: "Congés, absences et jours fériés", values: [true, true, true] },
        { label: "Pointage", values: [true, true, true] },
        { label: "Espace salarié mobile", values: [true, true, true] },
        { label: "Entités et sites multiples", values: [false, "2 entités", "Illimité"] },
      ],
    },
    {
      name: "Paie et conformité",
      rows: [
        { label: "Calcul CNAS et IRG, bulletins PDF", values: [true, true, true] },
        { label: "Déclarations G50 et DAS", values: [false, true, true] },
        { label: "Contrôle avant paie", values: [false, true, true] },
        { label: "Comparaison avec le mois précédent", values: [false, true, true] },
        { label: "Mises à jour des barèmes", values: [true, true, true] },
      ],
    },
    {
      name: "Sécurité et accompagnement",
      rows: [
        { label: "Rôles et permissions", values: ["3 rôles", "5 rôles", "5 rôles + sur mesure"] },
        { label: "Journal d'audit", values: [false, true, true] },
        { label: "Double authentification", values: ["Optionnelle", "Optionnelle", "Imposée"] },
        { label: "Reprise de données Excel / PC Paie", values: [true, true, "Accompagnée"] },
        { label: "Support", values: ["E-mail", "Téléphone + WhatsApp", "Interlocuteur dédié"] },
      ],
    },
  ],
  yes: "Inclus",
  no: "Non inclus",
};

export const pricingPage = {
  metadata: {
    title: "Tarifs : logiciel de paie et RH en dinars",
    description:
      "Tarifs publics de SIRH en DA selon l'effectif : Essentiel, Professionnel, Entreprise. Mensuel ou annuel (2 mois offerts), HT ou TTC, paiement par virement, chèque, CCP ou Baridimob.",
    alternates: { canonical: "/tarifs" },
  },
  eyebrow: "Tarifs",
  title: "Un prix clair, en dinars, selon votre effectif.",
  lead: "Choisissez la périodicité et l'affichage HT ou TTC. Aucun frais de reprise, aucun module facturé à part.",
  faqTitle: "Questions sur les tarifs",
  faq: [
    {
      q: "Les prix affichés sont-ils hors taxes ?",
      a: "Par défaut oui (HT). Le bouton TTC ajoute la TVA à 19 %. Votre facture détaille toujours HT, TVA et TTC.",
    },
    {
      q: "Comment payer ?",
      a: "Par virement, chèque, CCP ou Baridimob. Une facture proforma est envoyée sur demande avant tout règlement.",
    },
    {
      q: "Que signifient « 2 mois offerts » ?",
      a: "En facturation annuelle, vous réglez 10 mois pour 12 mois d'utilisation, soit environ 17 % d'économie.",
    },
    {
      q: "Que se passe-t-il si mon effectif change ?",
      a: "Vous changez d'offre quand vous franchissez une tranche, au prorata. Aucune pénalité ni réengagement.",
    },
    {
      q: "Y a-t-il un engagement ?",
      a: "Pas d'engagement en mensuel : résiliation à tout moment avec export complet de vos données. L'annuel est payé d'avance.",
    },
  ],
};
