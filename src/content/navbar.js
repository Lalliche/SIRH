// Landing › Navbar. Hash links resolve on the home page from any route (Next <Link href="/#…">).
export const navbar = {
  label: "Navigation principale",
  logoLabel: "SIRH, retour à l'accueil",
  skipLink: "Aller au contenu",
  links: [
    { label: "Produit", href: "/#produit" },
    { label: "Paie", href: "/#paie" },
    { label: "Conformité", href: "/#conformite" },
    { label: "Tarifs", href: "/tarifs" },
    {
      label: "Ressources",
      href: "/simulateur-irg",
      menu: [
        { label: "Simulateur de paie et d'IRG", description: "Du brut au net en quelques secondes", href: "/simulateur-irg" },
        { label: "Questions fréquentes", description: "Migration, hébergement, support", href: "/#faq" },
        { label: "Parler à l'équipe", description: "Par téléphone ou WhatsApp", href: "/contact" },
      ],
    },
  ],
  login: { label: "Se connecter", href: "/demo" },
  cta: { label: "Demander une démo", href: "/contact" },
  menuOpen: "Ouvrir le menu",
  menuClose: "Fermer le menu",
  mobileHint: "Une question ? Appelez-nous, nous répondons en français et en arabe.",
};
