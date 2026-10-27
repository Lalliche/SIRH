import Link from "next/link";
import { cn } from "@/lib/utils";

/** Pine arch (Moorish door) with one clay dot: the person standing in the doorway. */
export function BrandMark({ className }) {
  return (
    <svg viewBox="0 0 24 28" fill="none" aria-hidden className={cn("h-[1.6em] w-[1.37em] shrink-0", className)}>
      <path d="M2 27V11a10 10 0 0 1 20 0v16H2Z" className="fill-primary" />
      <circle cx="12" cy="17.5" r="2.7" className="fill-accent" />
    </svg>
  );
}

export function Wordmark({ className }) {
  return <span className={cn("font-display text-[1.3em] font-bold leading-none tracking-[-0.03em] text-fg", className)}>SIRH</span>;
}

/** Brand lockup. `compact` = arch only (collapsed rail). */
export default function Logo({ href = "/app", compact = false, className, ...props }) {
  return (
    <Link
      href={href}
      aria-label="SIRH, accueil"
      className={cn("inline-flex items-center gap-[0.55em] rounded-md transition-opacity duration-150 hover:opacity-85", compact && "justify-center", className)}
      {...props}
    >
      <BrandMark />
      {!compact && <Wordmark />}
    </Link>
  );
}
