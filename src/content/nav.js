import {
  LayoutDashboard, Inbox, Users, Network, Building2, UserPlus, CalendarDays, Fingerprint, MessageSquarePlus,
  Wallet, HandCoins, Calculator, FileCheck2, ReceiptText, GraduationCap, Target, HeartPulse, Megaphone,
  FolderOpen, ShieldCheck, BarChart3, Settings, CreditCard, Sparkles,
} from "lucide-react";

const ALL = ["admin", "hr", "manager", "accountant", "employee"];

// Single source for the app sidebar, Cmd+K and page titles. `roles` = who sees the item.
export const navGroups = [
  {
    label: "Accueil",
    items: [
      { href: "/app", label: "Tableau de bord", icon: LayoutDashboard, roles: ALL, exact: true },
      { href: "/app/inbox", label: "Approbations", icon: Inbox, roles: ["admin", "hr", "manager"], badge: "inbox" },
      { href: "/app/assistant", label: "Assistant IA", icon: Sparkles, roles: ALL },
    ],
  },
  {
    label: "Personnes",
    items: [
      { href: "/app/employees", label: "Employés", icon: Users, roles: ["admin", "hr", "manager", "accountant"] },
      { href: "/app/org-chart", label: "Organigramme", icon: Network, roles: ALL },
      { href: "/app/organization", label: "Organisation", icon: Building2, roles: ["admin", "hr"] },
      { href: "/app/recruitment", label: "Recrutement", icon: UserPlus, roles: ["admin", "hr", "manager"] },
    ],
  },
  {
    label: "Temps",
    items: [
      { href: "/app/leave", label: "Congés & absences", icon: CalendarDays, roles: ALL },
      { href: "/app/attendance", label: "Pointage", icon: Fingerprint, roles: ALL },
      { href: "/app/requests", label: "Demandes", icon: MessageSquarePlus, roles: ALL },
    ],
  },
  {
    label: "Paie",
    items: [
      { href: "/app/payroll", label: "Paie", icon: Wallet, roles: ["admin", "hr", "accountant"] },
      { href: "/app/loans", label: "Prêts & avances", icon: HandCoins, roles: ["admin", "hr", "accountant"] },
      { href: "/app/payroll/simulator", label: "Simulateur", icon: Calculator, roles: ["admin", "hr", "accountant"] },
      { href: "/app/payroll/declarations", label: "Déclarations", icon: FileCheck2, roles: ["admin", "hr", "accountant"] },
      { href: "/app/payslips", label: "Mes bulletins", icon: ReceiptText, roles: ALL },
    ],
  },
  {
    label: "Développement",
    items: [
      { href: "/app/trainings", label: "Formations", icon: GraduationCap, roles: ALL },
      { href: "/app/goals", label: "Objectifs", icon: Target, roles: ALL },
      { href: "/app/pulse", label: "Pouls des équipes", icon: HeartPulse, roles: ["admin", "hr", "manager"] },
    ],
  },
  {
    label: "Entreprise",
    items: [
      { href: "/app/announcements", label: "Annonces", icon: Megaphone, roles: ALL },
      { href: "/app/documents", label: "Documents", icon: FolderOpen, roles: ALL },
      { href: "/app/compliance", label: "Conformité", icon: ShieldCheck, roles: ["admin", "hr", "accountant"] },
      { href: "/app/reports", label: "Rapports", icon: BarChart3, roles: ["admin", "hr", "accountant"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/app/settings", label: "Paramètres", icon: Settings, roles: ["admin", "hr"] },
      { href: "/app/billing", label: "Facturation", icon: CreditCard, roles: ["admin"] },
    ],
  },
];
