import { dateLong, money } from "@/lib/format";
import { VAT, ttc } from "./data";

/** Printable invoice. The vendor block is fictional demo content. */
export default function InvoiceSheet({ invoice, company }) {
  const tva = Math.round(invoice.ht * VAT);
  return (
    <div>
      <header className="flex items-start justify-between gap-[1em] border-b-2 border-pine-700 pb-[1em]">
        <div>
          <p className="font-display text-[1.6em] font-bold text-pine-700">SIRH</p>
          <p className="text-[0.85em] text-black/70">Plateforme RH et paie · Alger, Algérie</p>
        </div>
        <div className="text-right">
          <p className="font-display text-[1.3em] font-bold uppercase">Facture</p>
          <p className="num">{invoice.id}</p>
          <p className="text-[0.85em] text-black/70">Émise le {dateLong(invoice.date)}</p>
        </div>
      </header>
      <section className="my-[1.5em] grid grid-cols-2 gap-[2em] text-[0.9em]">
        <div><p className="mb-[0.3em] text-[0.8em] font-semibold uppercase tracking-[0.06em] text-black/50">Facturé à</p><p className="font-semibold">{company.name}</p><p>{company.address}</p><p className="num">NIF {company.nif}</p><p className="num">RC {company.rc}</p></div>
        <div className="text-right"><p className="mb-[0.3em] text-[0.8em] font-semibold uppercase tracking-[0.06em] text-black/50">Statut</p><p className="font-semibold">{invoice.status === "paid" ? "Payée" : "À régler"}</p><p>Mode : {invoice.method}</p></div>
      </section>
      <table className="w-full border-collapse text-[0.95em]">
        <thead><tr className="border-b-2 border-black/60 text-left text-[0.8em] uppercase tracking-[0.06em]"><th className="py-[0.5em]">Désignation</th><th className="py-[0.5em] text-right">Montant HT</th></tr></thead>
        <tbody><tr className="border-b border-black/20"><td className="py-[0.8em]">{invoice.label}</td><td className="py-[0.8em] text-right num">{money(invoice.ht)}</td></tr></tbody>
      </table>
      <dl className="ml-auto mt-[1em] w-[18em] text-[0.95em]">
        <div className="flex justify-between py-[0.25em]"><dt>Total HT</dt><dd className="num">{money(invoice.ht)}</dd></div>
        <div className="flex justify-between py-[0.25em]"><dt>TVA ({Math.round(VAT * 100)} %)</dt><dd className="num">{money(tva)}</dd></div>
        <div className="flex justify-between border-y-2 border-black/60 py-[0.5em] font-bold"><dt>Total TTC</dt><dd className="num">{money(ttc(invoice.ht))}</dd></div>
      </dl>
      <p className="mt-[3em] text-[0.8em] text-black/50">Document de démonstration, sans valeur comptable. Règlement par virement, CCP ou Baridimob.</p>
    </div>
  );
}
