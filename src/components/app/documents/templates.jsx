import { CONTRACT_TYPES } from "@/data/constants";
import { computePayslip } from "@/lib/payroll";
import { dateLong, money } from "@/lib/format";
import Cachet from "./Cachet";

export const TEMPLATES = [
  { key: "attestation_travail", label: "Attestation de travail", hint: "Atteste l'emploi en cours", sensitive: false },
  { key: "attestation_salaire", label: "Attestation de salaire", hint: "Salaire mensuel brut et net", sensitive: true },
  { key: "certificat_travail", label: "Certificat de travail", hint: "À la fin du contrat", sensitive: false },
  { key: "contrat_cdi", label: "Contrat de travail CDI", hint: "Durée indéterminée", sensitive: true },
  { key: "contrat_cdd", label: "Contrat de travail CDD", hint: "Durée déterminée", sensitive: true },
];

const civ = (e) => (e.gender === "F" ? "Madame" : "Monsieur");
const born = (e) => (e.gender === "F" ? "née" : "né");
const emp = (e) => (e.gender === "F" ? "employée" : "employé");
const full = (e) => `${e.firstName} ${e.lastName.toUpperCase()}`;

function Letterhead({ company }) {
  return (
    <header className="border-b-2 border-pine-700 pb-[1em]">
      <p className="font-display text-[1.5em] font-bold uppercase tracking-[0.02em] text-pine-700">{company.name}</p>
      <p className="text-[0.85em] text-black/70">{company.address} · Tél. {company.phone} · {company.email}</p>
      <p className="text-[0.75em] text-black/60 num">NIF {company.nif} · NIS {company.nis} · RC {company.rc} · N° employeur CNAS {company.cnasEmployerNo}</p>
    </header>
  );
}

function Signature({ company, signer, place, on }) {
  return (
    <footer className="mt-[2.5em] flex items-end justify-between gap-[1em]">
      <p className="text-[0.95em]">Fait à {place}, le {dateLong(on)}.</p>
      <div className="flex items-end gap-[1em]">
        <div className="text-center text-[0.9em]">
          <p className="font-semibold">{signer?.title ?? "Le Responsable des Ressources Humaines"}</p>
          <p className="mt-[3.5em] border-t border-black/40 pt-[0.3em]">{signer?.name}</p>
        </div>
        <Cachet company={company} />
      </div>
    </footer>
  );
}

function Title({ children, sub }) {
  return (
    <div className="my-[2em] text-center">
      <h1 className="font-display text-[1.6em] font-bold uppercase tracking-[0.04em] underline decoration-1 underline-offset-[0.3em]">{children}</h1>
      {sub && <p className="mt-[0.5em] text-[0.85em] text-black/60">{sub}</p>}
    </div>
  );
}

const P = ({ children }) => <p className="mb-[1em] text-justify leading-[1.7]">{children}</p>;

/** ctx: { company, employee, position, department, entity, params, signer, on, place, endDate, motif } */
export function DocumentBody({ kind, ctx }) {
  const { company, employee: e, position, department, entity, signer, on, place } = ctx;
  const ref = `Réf. ${kind.slice(0, 3).toUpperCase()}/${e.matricule}/${on.slice(0, 4)}`;
  const common = (
    <>
      <Letterhead company={company} />
      <p className="mt-[1em] text-right text-[0.8em] text-black/60 num">{ref}</p>
    </>
  );

  if (kind === "attestation_travail") {
    return (
      <div>
        {common}
        <Title>Attestation de travail</Title>
        <P>Je soussigné(e), {signer?.name}, {signer?.title?.toLowerCase()} de la société <strong>{company.name}</strong>, atteste que {civ(e)} <strong>{full(e)}</strong>, {born(e)} le {dateLong(e.birthDate)} à {e.birthPlace}, matricule {e.matricule}, N° CNAS {e.cnasNumber || "—"}, est {emp(e)} au sein de notre société depuis le <strong>{dateLong(e.hireDate)}</strong>, en qualité de <strong>{position?.title}</strong> au service « {department?.name} » ({entity?.name}), sous contrat à {e.contract.type === "CDI" ? "durée indéterminée" : `durée déterminée (${CONTRACT_TYPES[e.contract.type] ?? e.contract.type})`}.</P>
        <P>L&apos;intéressé(e) est toujours en activité à la date de délivrance de la présente.</P>
        <P>La présente attestation est délivrée à la demande de l&apos;intéressé(e) pour servir et valoir ce que de droit.</P>
        <Signature company={company} signer={signer} place={place} on={on} />
      </div>
    );
  }

  if (kind === "attestation_salaire") {
    const s = computePayslip({ baseSalary: e.baseSalary, components: e.components }, ctx.params);
    return (
      <div>
        {common}
        <Title>Attestation de salaire</Title>
        <P>Je soussigné(e), {signer?.name}, {signer?.title?.toLowerCase()} de la société <strong>{company.name}</strong>, atteste que {civ(e)} <strong>{full(e)}</strong>, matricule {e.matricule}, N° CNAS {e.cnasNumber || "—"}, occupe le poste de <strong>{position?.title}</strong> depuis le {dateLong(e.hireDate)} et perçoit la rémunération mensuelle suivante :</P>
        <table className="mb-[1.2em] w-full border-collapse text-[0.95em]">
          <tbody>
            <tr className="border-b border-black/20"><td className="py-[0.4em]">Salaire de base</td><td className="py-[0.4em] text-right num">{money(s.base)}</td></tr>
            {s.components.map((c) => <tr key={c.code} className="border-b border-black/10"><td className="py-[0.4em]">{c.label}</td><td className="py-[0.4em] text-right num">{money(c.amount)}</td></tr>)}
            <tr className="border-b border-black/20 font-semibold"><td className="py-[0.5em]">Salaire brut mensuel</td><td className="py-[0.5em] text-right num">{money(s.gross)}</td></tr>
            <tr className="border-b border-black/10"><td className="py-[0.4em]">Retenue CNAS ({String(ctx.params.cnasEmployee * 100).replace(".", ",")} %)</td><td className="py-[0.4em] text-right num">− {money(s.cnasEmployee)}</td></tr>
            <tr className="border-b border-black/10"><td className="py-[0.4em]">IRG</td><td className="py-[0.4em] text-right num">− {money(s.irg)}</td></tr>
            <tr className="border-y-2 border-black/50 font-bold"><td className="py-[0.6em]">Salaire net mensuel</td><td className="py-[0.6em] text-right num">{money(s.net)}</td></tr>
          </tbody>
        </table>
        <P>La présente attestation est délivrée à l&apos;intéressé(e) pour servir et valoir ce que de droit.</P>
        <Signature company={company} signer={signer} place={place} on={on} />
      </div>
    );
  }

  if (kind === "certificat_travail") {
    const end = ctx.endDate || e.exitDate || on;
    return (
      <div>
        {common}
        <Title>Certificat de travail</Title>
        <P>Je soussigné(e), {signer?.name}, {signer?.title?.toLowerCase()} de la société <strong>{company.name}</strong>, certifie que {civ(e)} <strong>{full(e)}</strong>, {born(e)} le {dateLong(e.birthDate)} à {e.birthPlace}, a travaillé au sein de notre société du <strong>{dateLong(e.hireDate)}</strong> au <strong>{dateLong(end)}</strong>, en qualité de <strong>{position?.title}</strong> (service « {department?.name} »).</P>
        <P>L&apos;intéressé(e) nous quitte libre de tout engagement.</P>
        <P>Le présent certificat est délivré conformément aux dispositions de l&apos;article 67 de la loi n° 90-11 relative aux relations de travail, pour servir et valoir ce que de droit.</P>
        <Signature company={company} signer={signer} place={place} on={on} />
      </div>
    );
  }

  // contracts
  const cdd = kind === "contrat_cdd";
  const s = computePayslip({ baseSalary: e.baseSalary, components: e.components }, ctx.params);
  const start = e.contract?.startDate ?? e.hireDate;
  const end = ctx.endDate || e.contract?.endDate;
  const art = (n, title, body) => <section className="mb-[1em] break-inside-avoid"><h2 className="font-semibold">Article {n} — {title}</h2><p className="mt-[0.2em] text-justify leading-[1.65]">{body}</p></section>;
  return (
    <div className="text-[0.95em]">
      {common}
      <Title sub="Loi n° 90-11 du 21 avril 1990 relative aux relations de travail">{cdd ? "Contrat de travail à durée déterminée" : "Contrat de travail à durée indéterminée"}</Title>
      <p className="mb-[1em]">Entre les soussignés : <strong>{company.name}</strong>, {company.address}, représentée par {signer?.name}, {signer?.title?.toLowerCase()}, ci-après « l&apos;Employeur », et {civ(e)} <strong>{full(e)}</strong>, {born(e)} le {dateLong(e.birthDate)} à {e.birthPlace}, demeurant {e.address}, ci-après « le Travailleur ».</p>
      {art(1, "Engagement", `Le Travailleur est engagé en qualité de ${position?.title}, au service « ${department?.name} », affecté à ${entity?.name}, à compter du ${dateLong(start)}.`)}
      {art(2, "Durée", cdd ? `Le présent contrat est conclu pour une durée déterminée, du ${dateLong(start)} au ${end ? dateLong(end) : "[date de fin à préciser]"}, motif : ${ctx.motif || "accroissement temporaire d'activité"}.` : "Le présent contrat est conclu pour une durée indéterminée.")}
      {art(3, "Période d'essai", `Le Travailleur est soumis à une période d'essai se terminant le ${dateLong(e.contract?.trialEnd ?? start)}. Pendant cette période, chaque partie peut mettre fin au contrat sans préavis ni indemnité.`)}
      {art(4, "Rémunération", `Le Travailleur perçoit un salaire de base mensuel brut de ${money(e.baseSalary)}, auquel s'ajoutent les indemnités suivantes : ${e.components.map((c) => `${c.label.toLowerCase()} (${money(c.amount)})`).join(", ") || "néant"}, soit un salaire brut mensuel de ${money(s.gross)}. Les retenues légales (CNAS, IRG) sont opérées à la source.`)}
      {art(5, "Durée du travail", "La durée hebdomadaire de travail effectif est de 40 heures, répartie du dimanche au jeudi. Les heures supplémentaires sont rémunérées conformément à la législation en vigueur.")}
      {art(6, "Congés", "Le Travailleur bénéficie d'un congé annuel payé calculé à raison de deux jours et demi par mois de travail, conformément à la législation en vigueur.")}
      {art(7, "Obligations", "Le Travailleur s'engage à respecter le règlement intérieur de l'entreprise, les consignes d'hygiène et de sécurité ainsi que la confidentialité des informations dont il a connaissance.")}
      {art(8, "Rupture", cdd ? "Le contrat prend fin à son terme. Toute rupture anticipée est soumise aux dispositions légales applicables." : "Chaque partie peut mettre fin au contrat dans le respect du préavis prévu par la convention collective et la législation en vigueur.")}
      <p className="mt-[0.5em] text-[0.8em] text-black/50">Modèle de démonstration : à faire valider par votre conseil juridique avant usage.</p>
      <footer className="mt-[1.5em] flex items-end justify-between gap-[1em]">
        <p>Fait à {place}, le {dateLong(on)}, en deux exemplaires.</p>
      </footer>
      <div className="mt-[1.2em] grid grid-cols-2 gap-[2em] text-center text-[0.9em]">
        <div><p className="font-semibold">Le Travailleur</p><p className="text-[0.85em] text-black/60">« Lu et approuvé »</p><p className="mt-[3.5em] border-t border-black/40 pt-[0.3em]">{full(e)}</p></div>
        <div className="flex flex-col items-center"><p className="font-semibold">L&apos;Employeur</p><div className="mt-[0.8em]"><Cachet company={company} /></div></div>
      </div>
    </div>
  );
}
