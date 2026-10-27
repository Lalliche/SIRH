import AppShell from "@/components/layout/AppShell";

export const metadata = { title: { default: "Tableau de bord", template: "%s · SIRH" } };

export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
