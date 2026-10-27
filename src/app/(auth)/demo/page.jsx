import DemoChooser from "@/components/layout/DemoChooser";

export const metadata = { title: "Choisir un rôle", description: "Explorez SIRH avec l'un des cinq rôles de démonstration." };

export default async function DemoPage({ searchParams }) {
  const { next } = await searchParams;
  return <DemoChooser next={Array.isArray(next) ? next[0] : next} />;
}
