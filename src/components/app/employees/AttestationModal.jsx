"use client";

import { Printer } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { Paper, PrintOnly, printPage } from "@/components/app/_kit/Print";
import { CONTRACT_TYPES } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { useCollection, useDb } from "@/lib/db";
import { dateLong, fullName } from "@/lib/format";

/** The legal document itself — rendered both in the preview and in the print-only portal. */
export function AttestationDocument({ emp, company, position, department, entity, signer, signerPosition }) {
  const civ = emp.gender === "F" ? "Madame" : "Monsieur";
  const born = emp.gender === "F" ? "née" : "né";
  const left = emp.status === "sorti" && emp.exitDate;
  const cdi = emp.contract?.type === "CDI";
  const ref = `AT/${TODAY.slice(0, 4)}/${emp.matricule.replace(/\D/g, "")}`;
  return (
    <Paper className="font-sans text-[13px] leading-[1.7]">
      <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div>
          <p className="font-display text-[20px] font-bold tracking-tight">{company.name}</p>
          <p className="mt-1 text-[11px] leading-[1.5] text-black/70">
            {company.address}<br />
            Tél. {company.phone} · {company.email}
          </p>
        </div>
        <dl className="text-end text-[11px] leading-[1.6] text-black/70">
          <div>RC : {company.rc}</div>
          <div>NIF : {company.nif}</div>
          <div>N° employeur CNAS : {company.cnasEmployerNo}</div>
        </dl>
      </header>

      <p className="mt-6 text-end text-[11px] text-black/70">Réf. {ref}</p>
      <h2 className="mt-4 text-center font-display text-[22px] font-bold uppercase tracking-[0.08em]">Attestation de travail</h2>

      <div className="mt-8 space-y-4 text-justify">
        <p>
          Nous soussignés, <strong>{company.name}</strong>, dont le siège est situé à {company.address}, attestons par la présente que :
        </p>
        <p className="ps-6">
          {civ} <strong>{emp.lastName.toUpperCase()} {emp.firstName}</strong>, {born} le {dateLong(emp.birthDate)} à {emp.birthPlace}, matricule <span className="font-mono">{emp.matricule}</span>,
        </p>
        <p>
          {left ? "a occupé" : "occupe"} le poste de <strong>{position?.title ?? "—"}</strong> au sein du département « {department?.name ?? "—"} » ({entity?.name ?? "siège"}) depuis le {dateLong(emp.hireDate)}
          {cdi ? ", dans le cadre d'un contrat à durée indéterminée" : emp.contract?.endDate ? `, dans le cadre d'un contrat ${CONTRACT_TYPES[emp.contract.type] ?? emp.contract.type} courant jusqu'au ${dateLong(emp.contract.endDate)}` : ""}
          {left ? ` et a quitté l'entreprise le ${dateLong(emp.exitDate)}, libre de tout engagement` : "."}
          {left ? "." : ""}
        </p>
        <p>La présente attestation est délivrée à l’intéressé(e), sur sa demande, pour servir et valoir ce que de droit.</p>
      </div>

      <div className="mt-12 flex items-end justify-between gap-6">
        <p>Fait à {company.address.split(",").pop().trim()}, le {dateLong(TODAY)}</p>
        <div className="w-[17em] text-center">
          <p className="font-semibold">Pour la Direction</p>
          <p className="text-[12px] text-black/70">{signer ? fullName(signer) : ""}{signerPosition ? ` — ${signerPosition}` : ""}</p>
          <div className="mt-2 flex h-[6em] items-center justify-center rounded border border-dashed border-black/40 text-[11px] text-black/50">Cachet et signature</div>
        </div>
      </div>
    </Paper>
  );
}

export default function AttestationModal({ open, onClose, emp }) {
  const company = useDb((s) => s.company);
  const positions = useCollection("positions");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const employees = useCollection("employees");
  if (!emp) return null;
  const signer = employees.find((e) => e.positionId === "pos-dg") ?? null;
  const props = {
    emp,
    company,
    position: positions.find((p) => p.id === emp.positionId),
    department: departments.find((d) => d.id === emp.departmentId),
    entity: entities.find((e) => e.id === emp.entityId),
    signer,
    signerPosition: positions.find((p) => p.id === signer?.positionId)?.title,
  };
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title="Attestation de travail"
        description={`Document prêt à imprimer pour ${fullName(emp)}. Utilisez « Enregistrer au format PDF » dans la fenêtre d'impression.`}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Fermer</Button>
            <Button icon={Printer} onClick={printPage}>Imprimer / PDF</Button>
          </>
        }
      >
        <div className="rounded-lg bg-bg-sunken p-[1em] max-md:p-[0.4em]">
          <AttestationDocument {...props} />
        </div>
      </Modal>
      {open && <PrintOnly><AttestationDocument {...props} /></PrintOnly>}
    </>
  );
}
