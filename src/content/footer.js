// Landing › Footer. Address, phone, WhatsApp and email come from content/site.js (single source).
export const footer = {
  blurb: "Le système d'information RH pour les entreprises algériennes : dossiers, congés, pointage, paie et déclarations.",
  columns: [
    {
      title: "Produit",
      links: [
        { label: "Dossier salarié", href: "/#produit" },
        { label: "Paie CNAS et IRG", href: "/#paie" },
        { label: "Conformité locale", href: "/#conformite" },
        { label: "Tarifs", href: "/tarifs" },
      ],
    },
    {
      title: "Ressources",
      links: [
        { label: "Simulateur de paie et d'IRG", href: "/simulateur-irg" },
        { label: "Questions fréquentes", href: "/#faq" },
        { label: "Essayer la démo", href: "/demo" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ],
  contactTitle: "Nous joindre",
  addressLabel: "Adresse",
  phoneLabel: "Téléphone",
  whatsappLabel: "WhatsApp",
  emailLabel: "Courriel",
  hours: "Dimanche au jeudi, 8 h 30 – 17 h",
  // Legal routes do not exist yet: the lead creates the pages (or repoints these).
  legal: [
    { label: "Mentions légales", href: "/legal/mentions-legales" },
    { label: "CGU", href: "/legal/cgu" },
    { label: "Confidentialité", href: "/legal/confidentialite" },
  ],
  vocabularyTitle: "Vocabulaire que nous parlons",
  vocabulary: ["CNAS", "CASNOS", "IRG", "DAS", "G50", "SNMG", "FNPOS"],
  // [VERIFY] rates are secondary-sourced until confirmed against the current Loi de finances.
  paramsNote: "Paramètres de paie en vigueur au",
  copyright: "SIRH. Tous droits réservés.",
  prototype: "Prototype de démonstration : les données affichées sont fictives.",
  toTop: "Haut de page",
};
