"use client";

import { useMemo, useState } from "react";
import { FilePlus2, FileText, Printer, ShieldAlert } from "lucide-react";
import { Badge, Button, Card, EmptyState, SelectInput, TextInput, toast } from "@/components/ui";
import { Paper, PrintOnly, printPage } from "@/components/app/_kit/Print";
import { db, newId, useCollection, useDb } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { defaultParams } from "@/lib/payroll";
import { cn } from "@/lib/utils";
import { fullName } from "@/lib/format";
import { DocumentBody, TEMPLATES } from "./templates";

export default function TemplatesTab({ user }) {
  const employees = useCollection("employees");
  const positions = useCollection("positions");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const company = useDb((s) => s.company);
  const settings = useDb((s) => s.settings);
  const canGenerate = user.role === "admin" || user.role === "hr";

  const [kind, setKind] = useState("attestation_travail");
  const [empId, setEmpId] = useState("");
  const [on, setOn] = useState(TODAY);
  const [place, setPlace] = useState("Alger");
  const [endDate, setEndDate] = useState("");
  const [motif, setMotif] = useState("");

  const employee = employees.find((e) => e.id === empId);
  const signer = useMemo(() => {
    const s = employees.find((e) => e.role === "hr") ?? employees[0];
    return s && { name: fullName(s), title: "Le Responsable des Ressources Humaines" };
  }, [employees]);
  const tpl = TEMPLATES.find((t) => t.key === kind);

  const ctx = useMemo(() => {
    if (!employee) return null;
    const position = positions.find((p) => p.id === employee.positionId);
    return {
      company, employee, position,
      department: departments.find((d) => d.id === employee.departmentId),
      entity: entities.find((x) => x.id === employee.entityId),
      params: settings?.payroll ?? defaultParams, signer, on, place, endDate, motif,
    };
  }, [employee, positions, departments, entities, company, settings, signer, on, place, endDate, motif]);

  if (!canGenerate) {
    return <EmptyState icon={FileText} title="Générer un document" description="Les attestations et contrats sont générés par les RH. Faites la demande depuis le centre de demandes : vous serez notifié(e) dès qu'il est prêt." action={<Button href="/app/requests">Faire une demande</Button>} />;
  }

  const audited = () => {
    if (tpl.sensitive) db.audit(user.employeeId, "Salaire consulté", fullName(employee), `Génération : ${tpl.label}`);
  };
  const print = () => { audited(); db.audit(user.employeeId, "Document généré", tpl.label, fullName(employee)); setTimeout(printPage, 50); };
  const save = () => {
    audited();
    const name = `${tpl.label} — ${employee.firstName[0]}. ${employee.lastName}.pdf`;
    db.insert("documents", { id: newId("doc"), name, folder: "Dossiers salariés", kind: "pdf", size: 62000 + name.length * 300, uploadedAt: TODAY, expiresAt: null, ownerId: employee.id }, { prepend: true });
    db.audit(user.employeeId, "Document généré", tpl.label, fullName(employee));
    toast.success("Document enregistré dans le dossier du salarié.");
  };

  return (
    <div className="grid gap-[1.5em] lg:grid-cols-[22em_1fr]">
      <div className="flex flex-col gap-[1em]">
        <Card className="!p-[1em]">
          <p className="mb-[0.6em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">1. Modèle</p>
          <ul className="flex flex-col gap-[0.3em]" role="radiogroup" aria-label="Modèle de document">
            {TEMPLATES.map((t) => (
              <li key={t.key}>
                <button type="button" role="radio" aria-checked={kind === t.key} onClick={() => setKind(t.key)} className={cn("flex w-full items-start justify-between gap-[0.6em] rounded-md border px-[0.8em] py-[0.6em] text-start transition-colors", kind === t.key ? "border-primary bg-primary-soft" : "border-transparent hover:bg-surface-hover")}>
                  <span><span className="block text-sm font-medium text-fg">{t.label}</span><span className="block text-xs text-fg-muted">{t.hint}</span></span>
                  {t.sensitive && <ShieldAlert className="mt-[0.2em] size-[1.1em] shrink-0 text-fg-muted" aria-label="Contient des données salariales (consultation journalisée)" />}
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="flex flex-col gap-[0.9em] !p-[1em]">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">2. Salarié et options</p>
          <SelectInput aria-label="Salarié" placeholder="Choisir un salarié…" value={empId} onChange={setEmpId} options={employees.map((e) => ({ value: e.id, label: `${fullName(e)} (${e.matricule})` }))} />
          <TextInput label="Date du document" type="date" value={on} onChange={setOn} />
          <TextInput label="Lieu" value={place} onChange={setPlace} />
          {(kind === "certificat_travail" || kind === "contrat_cdd") && <TextInput label={kind === "contrat_cdd" ? "Fin du contrat" : "Date de fin"} type="date" value={endDate} onChange={setEndDate} hint="Par défaut : date figurant dans le dossier." />}
          {kind === "contrat_cdd" && <TextInput label="Motif du CDD" value={motif} onChange={setMotif} placeholder="Accroissement temporaire d'activité" />}
        </Card>
        {tpl.sensitive && <p className="flex items-start gap-[0.5em] text-xs text-fg-muted"><ShieldAlert className="mt-[0.1em] size-[1.1em] shrink-0" aria-hidden />Ce document affiche des données salariales : la génération est enregistrée dans le journal d&apos;audit.</p>}
      </div>

      <div className="min-w-0">
        {ctx ? (
          <>
            <div className="mb-[1em] flex flex-wrap items-center justify-between gap-[0.8em]">
              <div className="flex items-center gap-[0.6em]"><h2 className="font-semibold text-fg">Aperçu</h2><Badge tone="neutral" dot={false}>A4 · prêt à imprimer</Badge></div>
              <div className="flex gap-[0.6em]"><Button variant="secondary" icon={FilePlus2} onClick={save}>Enregistrer au dossier</Button><Button icon={Printer} onClick={print}>Imprimer / PDF</Button></div>
            </div>
            <div className="overflow-x-auto rounded-lg bg-bg-sunken p-[1em] sm:p-[2em]">
              <Paper className="min-w-[40em] text-[14px]"><DocumentBody kind={kind} ctx={ctx} /></Paper>
            </div>
            <PrintOnly><DocumentBody kind={kind} ctx={ctx} /></PrintOnly>
          </>
        ) : (
          <Card className="!p-0"><EmptyState icon={FileText} title="Choisissez un salarié" description="Les champs du document (identité, poste, dates, salaire) sont remplis automatiquement depuis son dossier." /></Card>
        )}
      </div>
    </div>
  );
}
