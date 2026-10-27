"use client";

import { usePathname } from "next/navigation";
import { Button, PageHeader } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { SECTIONS } from "./sections";

export default function SettingsShell({ children }) {
  const path = usePathname();
  return (
    <AccessGate roles={["admin", "hr"]}>
      {() => (
        <>
          <PageHeader title="Paramètres" description="Configuration de l'entreprise, de la paie et de la sécurité." />
          <div className="grid gap-[1.5em] lg:grid-cols-[14.5em_1fr]">
            <nav aria-label="Sections des paramètres" className="flex gap-[0.3em] overflow-x-auto pb-[0.3em] lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.map((s) => {
                const active = path === `/app/settings/${s.key}`;
                return (
                  <Button key={s.key} href={`/app/settings/${s.key}`} variant={active ? "soft" : "ghost"} icon={s.icon} aria-current={active ? "page" : undefined} className="lg:!w-full lg:!justify-start">
                    {s.label}
                  </Button>
                );
              })}
            </nav>
            <div className="min-w-0">{children}</div>
          </div>
        </>
      )}
    </AccessGate>
  );
}
