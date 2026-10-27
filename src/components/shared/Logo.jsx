import { cn } from "@/lib/utils";

/** The SIRH mark: a pine arch (Moorish doorway) with one clay dot, a person standing in it. */
export function ArchMark({ className, title }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[1.5em] shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d="M3 22V11a9 9 0 0 1 18 0v11z" className="fill-primary" />
      <path d="M7 22v-9.5a5 5 0 0 1 10 0V22" fill="none" strokeWidth="0.9" className="stroke-primary-fg/30" />
      <circle cx="12" cy="15.4" r="2.1" className="fill-clay-600" />
    </svg>
  );
}

/** Wordmark: Bricolage 700, tight tracking. Never decorate letters inside the word. */
export default function Logo({ className, markClassName, label = "SIRH" }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.45em] leading-none", className)}>
      <ArchMark className={markClassName} />
      <span className="font-display text-[1.25em] font-bold tracking-[-0.03em]">{label}</span>
    </span>
  );
}
