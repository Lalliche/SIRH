import { cn } from "@/lib/utils";

/** Decorative oversized cachet (concentric rings + circular text). Static, aria-hidden; set opacity from the caller. */
export default function StampMotif({ text = "SIRH · LA PAIE EN RÈGLE · ", className }) {
  return (
    <svg aria-hidden viewBox="0 0 400 400" className={cn("pointer-events-none select-none", className)} fill="none" stroke="currentColor">
      <defs>
        <path id="stamp-circle" d="M200 200 m-146 0 a146 146 0 1 1 292 0 a146 146 0 1 1 -292 0" />
      </defs>
      <circle cx="200" cy="200" r="190" strokeWidth="6" />
      <circle cx="200" cy="200" r="178" strokeWidth="2" />
      <circle cx="200" cy="200" r="112" strokeWidth="2" />
      <text fill="currentColor" stroke="none" fontSize="30" fontWeight="700" letterSpacing="9" fontFamily="var(--font-head)">
        <textPath href="#stamp-circle" startOffset="0">{text.repeat(2)}</textPath>
      </text>
      <rect x="152" y="152" width="96" height="96" strokeWidth="4" />
      <rect x="152" y="152" width="96" height="96" strokeWidth="4" transform="rotate(45 200 200)" />
    </svg>
  );
}
