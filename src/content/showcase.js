// Landing › Payslip showcase (pine-900 band). Amounts come from the sample payslip (payroll engine), not from here.
export const showcase = {
  id: "paie",
  eyebrow: "Le bulletin de paie",
  title: "Un bulletin que votre comptable relit sans sourciller.",
  description: "Chaque ligne est détaillée, chaque taux est un paramètre. Survolez le bulletin ou faites défiler : on vous montre où regarder.",
  link: { label: "Simuler un bulletin", href: "/simulateur-irg" },
  paperLabel: "Bulletin de paie d'exemple : octobre 2026, salaire brut 120 000 DA",
  annotations: [
    {
      key: "cnas",
      label: "Retenue CNAS",
      text: "9 % du salaire cotisable. Le taux est un paramètre : il change en un seul endroit, pour tous les bulletins.",
      side: "left",
      dy: -1.7,
    },
    {
      key: "irg",
      label: "IRG",
      text: "Barème progressif, abattement et lissage appliqués pour vous, avec le détail du calcul.",
      side: "right",
      dy: -1.3,
    },
    {
      key: "net",
      label: "Net à payer",
      text: "Le montant à virer. Brut, retenues et net se recoupent toujours, au dinar près.",
      side: "left",
      dy: 1.7,
    },
    {
      key: "patronal",
      label: "Cotisations patronales",
      text: "25 % à la charge de l'employeur, affichées pour connaître le coût réel d'un salarié.",
      side: "right",
      dy: 1.3,
    },
  ],
  note: "Exemple fictif calculé avec le moteur de paie SIRH. Taux à confirmer à chaque Loi de finances.",
};
