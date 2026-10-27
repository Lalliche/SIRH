import { CONTRACT_TYPES } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { amount, date, dateLong, fullName } from "@/lib/format";
import { computePayslip } from "@/lib/payroll";

/** Round ink seal (cachet) — static, print-safe. */
export function Seal({ company }) {
  return (
    <div className="relative inline-flex size-[7.5em] -rotate-[8deg] flex-col items-center justify-center rounded-full border-[3px] border-pine-700/85 p-[0.5em] text-center text-pine-700/85" style={{ boxShadow: "inset 0 0 0 3px white, inset 0 0 0 4px currentColor" }}>
      <span className="text-[0.55em] font-bold uppercase leading-tight tracking-[0.08em]">{company.name}</span>
      <span aria-hidden className="my-[0.25em] text-[1em] leading-none">✦</span>
      <span className="text-[0.55em] font-semibold uppercase tracking-[0.1em]">Direction RH</span>
      <span className="text-[0.5em] tracking-[0.08em]">Alger</span>
    </div>
  );
}

/**
 * Print-ready attestation (travail / salaire). Pure presentational; always dark-on-white (inside <Paper>).
 */
export default function AttestationDocument({ kind, docRef, employee, position, department, company, signer, signerTitle, issuedAt = TODAY }) {
  if (!employee) return null;
  const salary = kind === "attestation_salaire";
  const slip = salary ? computePayslip({ baseSalary: employee.baseSalary, components: employee.components }) : null;
  const civ = employee.gender === "F" ? "Madame" : "Monsieur";
  const born = employee.gender === "F" ? "née" : "né";
  const c = employee.contract;
  const title = salary ? "Attestation de salaire" : "Attestation de travail";

  return (
    <div className="flex min-h-[60em] flex-col font-sans text-[0.95em] leading-relaxed text-black">
      <header className="flex items-start justify-between gap-[1.5em] border-b-2 border-black pb-[1em]">
        <div>
          <p className="font-display text-[1.5em] font-bold leading-tight">{company.name}</p>
          <p className="text-[0.85em] text-black/70">{company.address}</p>
          <p className="text-[0.85em] text-black/70">Tél. {company.phone} · {company.email}</p>
        </div>
        <dl className="text-end text-[0.75em] leading-snug text-black/70">
          <div>NIF : <span className="font-mono">{company.nif}</span></div>
          <div>NIS : <span className="font-mono">{company.nis}</span></div>
          <div>RC : <span className="font-mono">{company.rc}</span></div>
          <div>N° employeur CNAS : <span className="font-mono">{company.cnasEmployerNo}</span></div>
        </dl>
      </header>

      <div className="mt-[1.5em] flex justify-between text-[0.85em] text-black/70">
        <span>Réf. : <span className="font-mono">{docRef ?? "—"}</span></span>
        <span>Alger, le {dateLong(issuedAt)}</span>
      </div>

      <h1 className="mt-[2.5em] text-center font-display text-[1.6em] font-bold uppercase tracking-[0.12em] underline decoration-1 underline-offset-[0.35em]">{title}</h1>

      <div className="mt-[2.5em] flex flex-col gap-[1.1em] text-justify">
        <p>
          Je soussigné(e), <strong>{signer ? fullName(signer) : "le Responsable des Ressources Humaines"}</strong>, {signerTitle ?? "Responsable des Ressources Humaines"} de la société <strong>{company.name}</strong>, atteste que :
        </p>
        <p className="ps-[2em]">
          {civ} <strong className="uppercase">{employee.lastName}</strong> <strong>{employee.firstName}</strong>, {born} le {date(employee.birthDate)} à {employee.birthPlace}, titulaire du matricule <span className="font-mono">{employee.matricule}</span> et du numéro d’affiliation CNAS <span className="font-mono">{employee.cnasNumber || "en cours d'attribution"}</span>,
        </p>
        <p>
          {salary ? "est employé(e)" : "est employé(e)"} au sein de notre entreprise depuis le <strong>{dateLong(employee.hireDate)}</strong>, en qualité de <strong>{position}</strong>
          {department ? ` (${department})` : ""}, dans le cadre d’un contrat <strong>{CONTRACT_TYPES[c?.type] ?? c?.type}</strong>
          {c?.endDate ? ` à échéance du ${dateLong(c.endDate)}` : " à durée indéterminée"}.
        </p>
        {salary && slip && (
          <p>
            L’intéressé(e) perçoit une rémunération mensuelle brute de <strong>{amount(slip.gross)} DA</strong>, soit un salaire net mensuel de <strong>{amount(slip.net)} DA</strong> après retenues légales (cotisations sociales CNAS et IRG).
          </p>
        )}
        <p>
          La présente attestation est délivrée à l’intéressé(e), sur sa demande, pour servir et valoir ce que de droit.
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-[2em] pt-[3em]">
        <Seal company={company} />
        <div className="w-[16em] text-center">
          <p className="font-medium">{signerTitle ?? "Le Responsable des Ressources Humaines"}</p>
          <p className="text-[0.85em] text-black/70">{signer ? fullName(signer) : ""}</p>
          <div className="mt-[3.5em] border-t border-dashed border-black/50 pt-[0.3em] text-[0.7em] text-black/60">Signature et cachet de l’entreprise</div>
        </div>
      </div>
      <p className="mt-[1.5em] border-t border-black/20 pt-[0.6em] text-center text-[0.65em] text-black/55">Document généré par SIRH · {company.name} · {company.address}</p>
    </div>
  );
}
