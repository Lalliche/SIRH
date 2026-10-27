"use client";

import { Printer } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { Paper, PrintOnly, printPage } from "@/components/app/_kit/Print";
import { useDirectory } from "@/components/app/leave/use-directory";
import { REQUEST_KINDS } from "@/data/constants";
import { db, useDb } from "@/lib/db";
import { fullName } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import AttestationDocument from "./AttestationDocument";

/** Print-ready attestation preview. Print goes through the shared body-level print portal. */
export default function DocumentPreviewModal({ request, onClose }) {
  const me = useCurrentUser();
  const dir = useDirectory();
  const company = useDb((s) => s.company);
  const employee = request ? dir.byId[request.employeeId] : null;
  const signer = dir.employees.find((e) => e.role === "hr");

  const doc = request && employee && (
    <AttestationDocument
      kind={request.kind}
      docRef={request.docRef}
      employee={employee}
      position={dir.position(employee)}
      department={dir.department(employee)}
      company={company}
      signer={signer}
      signerTitle={signer ? dir.position(signer) : undefined}
      issuedAt={request.decidedAt ?? undefined}
    />
  );

  const print = () => {
    db.audit(me.employeeId, request.kind === "attestation_salaire" ? "Attestation de salaire imprimée" : "Attestation de travail imprimée", fullName(employee), request.docRef ?? "");
    printPage();
  };

  return (
    <>
      <Modal
        open={!!request}
        onClose={onClose}
        size="lg"
        title={request ? REQUEST_KINDS[request.kind] : ""}
        description={employee ? `${fullName(employee)} · ${request.docRef ?? "projet"}` : ""}
        footer={<><Button variant="ghost" onClick={onClose}>Fermer</Button><Button icon={Printer} onClick={print}>Imprimer / Enregistrer en PDF</Button></>}
      >
        <div className="rounded-lg bg-bg-sunken p-[1em]"><Paper className="text-[0.85em]">{doc}</Paper></div>
      </Modal>
      {request && <PrintOnly><Paper>{doc}</Paper></PrintOnly>}
    </>
  );
}
