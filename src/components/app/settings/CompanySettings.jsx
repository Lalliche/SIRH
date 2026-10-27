"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button, TextInput, SelectInput, toast } from "@/components/ui";
import { db, useDb } from "@/lib/db";
import Section from "./Section";

const LEGAL_FORMS = ["SPA", "SARL", "EURL", "SNC", "EPE", "Entreprise individuelle"];
const digits = (n) => (v) => (/^\d{15}$/.test(v) ? "" : `Ce numéro comporte ${n} chiffres.`);
const RULES = {
  name: (v) => (v.trim() ? "" : "La raison sociale est obligatoire."),
  nif: digits(15),
  nis: digits(15),
  rc: (v) => (v.trim() ? "" : "Le numéro de registre du commerce est obligatoire."),
  cnasEmployerNo: (v) => (/^[\d ]{6,}$/.test(v) ? "" : "Format attendu : chiffres et espaces (ex. 16 123456 78)."),
  email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? "" : "Adresse e-mail invalide."),
};

export default function CompanySettings({ user }) {
  const company = useDb((s) => s.company);
  const [draft, setDraft] = useState(company);
  const [errors, setErrors] = useState({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(company);
  const set = (k) => (v) => { setDraft((d) => ({ ...d, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const save = () => {
    const e = Object.fromEntries(Object.entries(RULES).map(([k, f]) => [k, f(draft[k] ?? "")]).filter(([, m]) => m));
    setErrors(e);
    if (Object.keys(e).length) return toast.error("Corrigez les champs en rouge avant d'enregistrer.");
    db.set("company", draft);
    db.audit(user.employeeId, "Identité de l'entreprise modifiée", draft.name, "");
    toast.success("Informations de l'entreprise enregistrées.");
  };

  return (
    <Section
      title="Identité de l'entreprise"
      description="Ces informations figurent sur les bulletins, attestations, contrats et déclarations."
      footer={<><Button variant="ghost" disabled={!dirty} onClick={() => { setDraft(company); setErrors({}); }}>Annuler</Button><Button disabled={!dirty} onClick={save}>Enregistrer</Button></>}
    >
      <div className="grid gap-[1.2em] md:grid-cols-2">
        <div className="flex items-center gap-[1em] md:col-span-2">
          <div className="flex size-[4.5em] items-center justify-center rounded-lg border-2 border-dashed border-border-strong bg-bg-sunken font-display text-h2 font-bold text-fg-muted" aria-hidden>{draft.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
          <div>
            <p className="font-medium text-fg">Logo</p>
            <p className="mb-[0.5em] text-xs text-fg-muted">PNG ou SVG, fond transparent. Emplacement réservé dans cette démo.</p>
            <Button variant="secondary" size="sm" icon={ImagePlus} onClick={() => toast.info("Téléversement de logo non disponible dans la démo.")}>Téléverser un logo</Button>
          </div>
        </div>
        <TextInput className="md:col-span-1" label="Raison sociale" required value={draft.name} onChange={set("name")} error={errors.name} />
        <SelectInput label="Forme juridique" value={draft.legalForm} onChange={set("legalForm")} options={LEGAL_FORMS} />
        <TextInput label="NIF" required inputMode="numeric" className="font-mono" value={draft.nif} onChange={set("nif")} error={errors.nif} hint="Numéro d'identification fiscale (15 chiffres)" />
        <TextInput label="NIS" required inputMode="numeric" value={draft.nis} onChange={set("nis")} error={errors.nis} hint="Numéro d'identification statistique (15 chiffres)" />
        <TextInput label="Registre du commerce (RC)" required value={draft.rc} onChange={set("rc")} error={errors.rc} />
        <TextInput label="N° employeur CNAS" required value={draft.cnasEmployerNo} onChange={set("cnasEmployerNo")} error={errors.cnasEmployerNo} />
        <TextInput className="md:col-span-2" label="Adresse du siège" value={draft.address} onChange={set("address")} />
        <TextInput label="Téléphone" type="tel" value={draft.phone} onChange={set("phone")} />
        <TextInput label="E-mail RH" type="email" value={draft.email} onChange={set("email")} error={errors.email} />
        <TextInput label="Secteur d'activité" value={draft.sector ?? ""} onChange={set("sector")} />
      </div>
    </Section>
  );
}
