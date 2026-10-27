import { cn } from "@/lib/utils";

export function Skeleton({ className }) {
  return <div aria-hidden className={cn("animate-shimmer rounded-md bg-bg-sunken bg-[linear-gradient(90deg,transparent,var(--surface-hover),transparent)] bg-[length:200%_100%]", className)} />;
}

/** Generic page skeleton: header, KPI strip, table card. */
export default function PageSkeleton() {
  return (
    <div role="status" aria-label="Chargement de la page">
      <div className="mb-[1.75em] space-y-[0.6em]">
        <Skeleton className="h-[0.9em] w-[7em]" />
        <Skeleton className="h-[2.2em] w-[18em] max-w-full" />
        <Skeleton className="h-[1em] w-[28em] max-w-full" />
      </div>
      <div className="mb-[1.5em] grid grid-cols-2 gap-[1em] lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[7.5em] rounded-lg" />)}
      </div>
      <div className="rounded-lg border border-border bg-surface p-[1em]">
        <Skeleton className="mb-[1em] h-[2.5em] w-full" />
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="mb-[0.6em] h-[2.2em] w-full" />)}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
