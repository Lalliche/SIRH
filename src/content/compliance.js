// Landing > #conformite. Dates are "à jour au" claims: keep them in sync with the real update log.
// [VERIFY] every rate, ceiling and date below must be confirmed against Journal officiel / CNAS / DGI before launch.
export const compliance = {
  id: "conformite",
  eyebrow: "Conformité locale",
  title: "Le droit algérien, déjà dans le calcul.",
  description:
    "Barèmes, plafonds et calendriers sont des paramètres datés, pas du code figé. Quand la loi de finances change, SIRH change avec elle, et le bulletin garde la trace de la version appliquée.",
  mapLabel: "Carte schématique de l'Algérie avec les principaux sites desservis, depuis Alger",
  hubsLabel: "Sites",
  asOfLabel: "à jour au",
  rows: [
    {
      id: "irg",
      title: "Barème IRG à jour",
      detail: "6 tranches mensuelles de 0 % à 35 %, abattement de 40 % (1 000 à 1 500 DA), lissage 30 001 – 35 000 DA.",
      tag: "IRG",
      asOf: "2026-01-01", // [VERIFY]
      hub: "alger",
    },
    {
      id: "cnas",
      title: "Plafonds et taux CNAS",
      detail: "9 % part salarié, 25 % part patronale, 0,5 % œuvres sociales. Assiette cotisable paramétrable par rubrique.",
      tag: "CNAS",
      asOf: "2026-01-01", // [VERIFY] plafonds branche par branche non modélisés dans le prototype
      hub: "oran",
    },
    {
      id: "snmg",
      title: "SNMG à 24 000 DA",
      detail: "Contrôle automatique du plancher au prorata du temps de travail, alerte avant validation de la paie.",
      tag: "SNMG",
      asOf: "2026-01-14", // [VERIFY] décret publié au JO du 14 janvier 2026
      hub: "constantine",
    },
    {
      id: "feries",
      title: "Jours fériés légaux",
      detail: "Fêtes fixes et fêtes religieuses. Les dates lunaires restent « estimées » jusqu'à votre confirmation.",
      tag: "Calendrier",
      asOf: "2026-10-01", // [VERIFY]
      hub: "ghardaia",
    },
    {
      id: "weekend",
      title: "Week-end vendredi-samedi",
      detail: "Semaine de travail du dimanche au jeudi dans le pointage, les congés et le calcul des jours ouvrés.",
      tag: "Calendrier",
      asOf: "2026-10-01",
      hub: "bechar",
    },
    {
      id: "g50",
      title: "Déclaration G50 mensuelle",
      detail: "Retenues IRG sur salaires prêtes à déposer, avec rappel avant l'échéance du 20 du mois suivant.",
      tag: "G50",
      asOf: "2026-01-01", // [VERIFY]
      hub: "ouargla",
    },
    {
      id: "das",
      title: "DAS et G29 annuelles",
      detail: "Exports par salarié (NIN, brut, cotisable, CNAS, IRG), totaux de contrôle et suivi du dépôt.",
      tag: "DAS · G29",
      asOf: "2026-01-01", // [VERIFY] format officiel non reproduit dans le prototype
      hub: "tamanrasset",
    },
  ],
  footer: {
    label: "Dernière vérification du jeu de règles",
    asOf: "2026-10-27", // [VERIFY]
    note: "Prototype : les paramètres sont indicatifs et doivent être confirmés avec votre expert avant mise en production.",
  },
  stampLabel: "À JOUR",
  stampSub: "SIRH",
};

// Labels for the schematic map (coordinates live in landing/_b/dz-geo.js)
export const mapHubs = [
  { id: "alger", label: "Alger", capital: true },
  { id: "oran", label: "Oran" },
  { id: "constantine", label: "Constantine" },
  { id: "ghardaia", label: "Ghardaïa" },
  { id: "bechar", label: "Béchar" },
  { id: "ouargla", label: "Ouargla" },
  { id: "tamanrasset", label: "Tamanrasset" },
  { id: "adrar", label: "Adrar" },
  { id: "tindouf", label: "Tindouf" },
];
