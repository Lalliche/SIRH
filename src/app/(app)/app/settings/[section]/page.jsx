import { notFound } from "next/navigation";
import SettingsSection from "@/components/app/settings/SettingsSection";
import { SECTIONS } from "@/components/app/settings/sections";

export function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.key }));
}

export async function generateMetadata({ params }) {
  const { section } = await params;
  const s = SECTIONS.find((x) => x.key === section);
  return { title: s ? `${s.label} · Paramètres` : "Paramètres" };
}

export default async function SettingsSectionPage({ params }) {
  const { section } = await params;
  if (!SECTIONS.some((s) => s.key === section)) notFound();
  return <SettingsSection section={section} />;
}
