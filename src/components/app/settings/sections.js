import { Bell, Building2, CalendarDays, Database, GitBranch, ScrollText, Users, Wallet } from "lucide-react";

export const SECTIONS = [
  { key: "company", label: "Entreprise", icon: Building2, description: "Identité légale et identifiants fiscaux et sociaux." },
  { key: "users", label: "Utilisateurs et rôles", icon: Users, description: "Qui accède à quoi. Invitez et changez les rôles." },
  { key: "calendar", label: "Calendrier de travail", icon: CalendarDays, description: "Semaine de travail, jours fériés et horaires de Ramadan." },
  { key: "payroll", label: "Paramètres de paie", icon: Wallet, description: "SNMG, taux de cotisations et barème IRG, avec date d'effet." },
  { key: "workflows", label: "Circuits de validation", icon: GitBranch, description: "Qui valide quoi, dans quel ordre." },
  { key: "notifications", label: "Notifications", icon: Bell, description: "Canaux et fréquence des alertes." },
  { key: "audit-log", label: "Journal d'audit", icon: ScrollText, description: "Qui a fait quoi, et qui a consulté les salaires." },
  { key: "data", label: "Données", icon: Database, description: "Export, import et réinitialisation des données de démonstration." },
];
