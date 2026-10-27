// Landing > #demo (final CTA) and /contact.
export const cta = {
  id: "demo",
  eyebrow: "Démonstration",
  title: "Voyez votre première paie en règle.",
  description:
    "Dites-nous combien de salariés vous gérez. Un conseiller vous rappelle sous 2 h ouvrées pour une démonstration de 30 minutes, sur vos propres cas.",
  contact: {
    phoneLabel: "Téléphone",
    emailLabel: "E-mail",
    hours: "Dimanche – jeudi, 8 h 30 – 17 h",
  },
  whatsapp: {
    label: "Écrire sur WhatsApp",
    hint: "Vous préférez discuter ? Réponse en quelques minutes aux heures ouvrées.",
    message: "Bonjour, je souhaite une démonstration de SIRH.",
  },
  form: {
    title: "Demander une démo",
    fields: {
      name: { label: "Nom et prénom", placeholder: "Karim Benali", autoComplete: "name" },
      company: { label: "Entreprise", placeholder: "SARL Mitidja Services", autoComplete: "organization" },
      headcount: { label: "Effectif", placeholder: "Choisir une tranche" },
      phone: { label: "Téléphone", placeholder: "0550 12 34 56", autoComplete: "tel" },
      email: { label: "E-mail professionnel", placeholder: "karim@entreprise.dz", autoComplete: "email" },
    },
    headcountOptions: [
      { value: "1-10", label: "1 à 10 salariés" },
      { value: "11-25", label: "11 à 25 salariés" },
      { value: "26-50", label: "26 à 50 salariés" },
      { value: "51-100", label: "51 à 100 salariés" },
      { value: "101-250", label: "101 à 250 salariés" },
      { value: "251-500", label: "251 à 500 salariés" },
      { value: "500+", label: "Plus de 500 salariés" },
    ],
    submit: "Demander une démo",
    submitting: "Envoi en cours…",
    privacy: "Vos coordonnées servent uniquement à vous rappeler. Pas de démarchage tiers.",
    error: "L'envoi a échoué. Réessayez ou écrivez-nous sur WhatsApp.",
  },
  success: {
    stamp: "REÇU",
    stampSub: "SIRH",
    title: "Demande bien reçue.",
    text: "Merci {name}. Un conseiller vous rappelle au {phone} sous 2 h ouvrées.",
    reference: "Référence",
    again: "Envoyer une autre demande",
  },
};

export const contactPage = {
  metadata: {
    title: "Contact et demande de démonstration",
    description:
      "Demandez une démonstration de SIRH, la plateforme de paie et RH pour les entreprises algériennes. Réponse sous 2 h ouvrées par téléphone, WhatsApp ou e-mail.",
    alternates: { canonical: "/contact" },
  },
  eyebrow: "Contact",
  title: "Parlons de votre paie.",
  lead: "Une démonstration de 30 minutes, sur vos cas réels : barème IRG, CNAS, déclarations. Sans engagement.",
  steps: [
    "Vous remplissez le formulaire ou nous écrivez sur WhatsApp.",
    "Un conseiller vous rappelle sous 2 h ouvrées.",
    "Démonstration sur vos propres cas, devis proforma sur demande.",
  ],
};
