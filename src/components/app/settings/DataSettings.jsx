"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Badge, Button, ConfirmDialog, toast } from "@/components/ui";
import { db, getState, useDb } from "@/lib/db";
import { downloadFile, fileSize } from "@/components/app/_kit/csv";
import { SEED_VERSION } from "@/data/seed";
import Section from "./Section";

export default function DataSettings({ user }) {
  const fileRef = useRef(null);
  const [reset, setReset] = useState(false);
  const [pending, setPending] = useState(null); // parsed import awaiting confirmation
  const employees = useDb((s) => s.employees);
  const runs = useDb((s) => s.payrollRuns);
  const audit = useDb((s) => s.audit);

  const exportJson = () => {
    const json = JSON.stringify(getState(), null, 2);
    downloadFile("sirh-donnees.json", json, "application/json");
    db.audit(user.employeeId, "Export des données", "Toutes les données", fileSize(json.length));
    toast.success("Export JSON téléchargé.");
  };

  const readFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data?.version !== SEED_VERSION || !Array.isArray(data.employees)) throw new Error("format");
        setPending(data);
      } catch {
        toast.error("Fichier invalide : utilisez un export JSON produit par cette application (même version).");
      }
    };
    reader.readAsText(file);
  };

  const applyImport = () => {
    Object.entries(pending).forEach(([k, v]) => k !== "version" && db.set(k, v));
    db.audit(user.employeeId, "Import des données", "Toutes les données", `${pending.employees.length} employés`);
    toast.success("Données importées.");
    setPending(null);
  };

  return (
    <div className="flex flex-col gap-[1.25em]">
      <Section title="Vos données" description="Tout est stocké dans ce navigateur (prototype). Rien n'est envoyé à un serveur.">
        <dl className="grid grid-cols-3 gap-[1em] text-center">
          {[["Employés", employees.length], ["Paies", runs.length], ["Entrées d'audit", audit.length]].map(([l, v]) => (
            <div key={l} className="rounded-md bg-bg-sunken p-[0.9em]"><dd className="font-display text-h2 font-semibold text-fg num">{v}</dd><dt className="text-xs text-fg-muted">{l}</dt></div>
          ))}
        </dl>
      </Section>

      <Section title="Exporter et importer" description="Sauvegardez l'état complet de la démo ou restaurez une sauvegarde précédente.">
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Importer un fichier JSON" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex flex-wrap gap-[0.7em]">
          <Button variant="secondary" icon={Download} onClick={exportJson}>Exporter en JSON</Button>
          <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>Importer un JSON</Button>
        </div>
      </Section>

      <Section title="Réinitialiser les données de démo" description="Remet les 49 employés, paies, congés et journaux à leur état initial. Vos modifications seront perdues.">
        <div className="flex flex-wrap items-center gap-[1em]">
          <Button variant="danger" icon={RotateCcw} onClick={() => setReset(true)}>Réinitialiser les données de démo</Button>
          <Badge tone="warning">Action irréversible</Badge>
        </div>
      </Section>

      <ConfirmDialog open={reset} onClose={() => setReset(false)} danger title="Réinitialiser les données de démo ?" description="Toutes les modifications (employés, congés, objectifs, documents, annonces…) seront remplacées par les données d'origine." confirmLabel="Réinitialiser" onConfirm={() => { db.reset(); toast.success("Données de démo réinitialisées."); }} />
      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} danger title="Remplacer les données actuelles ?" description={pending ? `Le fichier contient ${pending.employees.length} employés et ${pending.payrollRuns?.length ?? 0} paies. Les données actuelles seront remplacées.` : ""} confirmLabel="Importer" onConfirm={applyImport} />
    </div>
  );
}
