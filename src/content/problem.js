// Landing › Problem. Three pain points as ledger-ruled rows, each answered by one line.
export const problem = {
  eyebrow: "Le quotidien de la paie",
  title: "La paie algérienne ne pardonne pas l'à-peu-près.",
  description: "Un taux mal recopié, une échéance oubliée, un solde de congés contesté : les erreurs coûtent cher, et on les découvre toujours trop tard.",
  rows: [
    {
      pain: "Excel qui plante au calcul de l'IRG",
      detail: "Barème recopié à la main, cellules écrasées, abattement oublié : dix bulletins faux avant la fin du mois.",
      fix: "Le barème IRG, l'abattement et le lissage sont dans le moteur de paie, avec le détail de chaque ligne.",
      tag: "#REF!",
    },
    {
      pain: "Déclarations de dernière minute",
      detail: "G50, DAS, états CNAS : tout se rassemble à la veille de l'échéance, à partir de trois fichiers différents.",
      fix: "Les exports G50 et DAS sont générés depuis les bulletins validés, avec la liste des écarts à corriger.",
      tag: "J-1",
    },
    {
      pain: "Congés dans un cahier",
      detail: "Soldes contestés, week-end vendredi-samedi oublié, aucun historique à présenter lors d'un contrôle.",
      fix: "Soldes en temps réel, jours fériés légaux, validation par le manager et historique horodaté.",
      tag: "Solde ?",
    },
  ],
  fixLabel: "Avec SIRH",
  total: "Résultat : des erreurs que l'on découvre trop tard.",
};
