"use client";

import { useState } from "react";
import { FileStack, LayoutTemplate } from "lucide-react";
import { PageHeader, Tabs } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { useCollection } from "@/lib/db";
import VaultTab from "./VaultTab";
import TemplatesTab from "./TemplatesTab";

function Content({ user }) {
  const documents = useCollection("documents");
  const employees = useCollection("employees");
  const [tab, setTab] = useState("vault");
  return (
    <>
      <PageHeader title="Documents" description={user.role === "employee" ? "Vos documents et ceux de l'entreprise." : "Le coffre RH : dossiers, dates d'expiration et génération d'attestations et de contrats."} />
      <Tabs className="mb-[1.5em]" value={tab} onChange={setTab} tabs={[{ value: "vault", label: "Coffre", icon: FileStack }, { value: "templates", label: "Modèles et génération", icon: LayoutTemplate }]} />
      {tab === "vault" ? <VaultTab user={user} documents={documents} employees={employees} /> : <TemplatesTab user={user} />}
    </>
  );
}

export default function DocumentsView() {
  return <AccessGate>{(user) => <Content user={user} />}</AccessGate>;
}
