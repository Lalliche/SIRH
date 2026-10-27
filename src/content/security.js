// Landing > #securite. Only claims that are true. Anything unconfirmed is marked [PLACEHOLDER] in code
// and phrased as a commitment to disclose, never as a fact.
import { MapPin, UsersRound, ScrollText, DatabaseBackup, KeyRound } from "lucide-react";

export const security = {
  id: "securite",
  eyebrow: "Sécurité et données",
  title: "Vos données de paie méritent un coffre, pas un tableur partagé.",
  description:
    "Les salaires sont les données les plus sensibles de l'entreprise. SIRH les protège par défaut : droits par rôle, traçabilité, sauvegardes et double authentification.",
  hosting: {
    icon: MapPin,
    title: "Hébergement",
    text: "Le lieu d'hébergement et le prestataire seront précisés dans votre contrat avant toute signature, avec la juridiction applicable et la liste des sous-traitants.",
    status: "Localisation à confirmer", // [PLACEHOLDER] hosting country / datacenter not decided for the prototype
    note: "Nous préférons l'écrire plainement plutôt qu'afficher un drapeau.",
  },
  roles: {
    icon: UsersRound,
    title: "Rôles et permissions",
    text: "Cinq rôles prêts à l'emploi. Un salarié ne voit que son dossier ; la paie n'est visible que des rôles autorisés.",
    list: [
      { role: "Direction", scope: "Tout, y compris validation de la paie" },
      { role: "Responsable RH", scope: "Dossiers, congés, paie" },
      { role: "Chef de service", scope: "Son équipe uniquement" },
      { role: "Comptable paie", scope: "Paie et déclarations" },
      { role: "Employé", scope: "Son propre dossier" },
    ],
  },
  audit: {
    icon: ScrollText,
    title: "Journal d'audit",
    text: "Chaque action sensible laisse une trace : qui, quoi, quand. Consultation d'un salaire, validation de paie, modification de RIB.",
    lines: [
      { time: "09:14", who: "Karim Benali", what: "a validé la paie d'octobre" },
      { time: "09:02", who: "Amina Haddad", what: "a consulté le salaire de L. Mansouri" },
      { time: "08:47", who: "Sofiane Brahimi", what: "a modifié un RIB (en attente)" },
    ],
  },
  backups: {
    icon: DatabaseBackup,
    title: "Sauvegardes",
    text: "Sauvegardes automatiques chiffrées et restauration testée. Fréquence, rétention et délais de reprise figurent au contrat.", // [PLACEHOLDER] RPO/RTO to be confirmed
    facts: [
      { label: "Fréquence", value: "Quotidienne" },
      { label: "Chiffrement", value: "Au repos et en transit" },
    ],
  },
  twofa: {
    icon: KeyRound,
    title: "Double authentification",
    text: "Code à usage unique via application d'authentification pour les rôles qui voient les salaires. Imposable à toute l'entreprise.",
    digits: ["4", "8", "2", "1", "7", "9"],
  },
};
