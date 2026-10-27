// Company seal for generated documents — static (the animated Stamp is reserved for validations).
export default function Cachet({ company }) {
  return (
    <div className="flex size-[7.5em] -rotate-6 flex-col items-center justify-center rounded-full border-[3px] border-pine-700/80 p-[0.5em] text-center text-pine-700/80" aria-label="Cachet de l'entreprise">
      <span className="text-[0.62em] font-bold uppercase leading-tight tracking-[0.08em]">{company.name}</span>
      <span className="my-[0.3em] h-px w-[70%] bg-pine-700/60" />
      <span className="text-[0.55em] font-semibold uppercase tracking-[0.1em]">Direction des RH</span>
      <span className="text-[0.5em]">{company.address.split(",").pop().trim()}</span>
    </div>
  );
}
