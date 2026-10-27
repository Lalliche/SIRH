import { cn } from "@/lib/utils";

export function Skeleton({ className }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-bg-sunken bg-[linear-gradient(90deg,transparent,var(--surface-hover),transparent)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

/** Layout-matching placeholder shown until the session cookie is read (first paint). */
export function PageSkeleton({ cards = 4 }) {
  return (
    <div role="status" aria-label="Chargement" className="flex flex-col gap-[1.5em]">
      <div className="flex flex-col gap-[0.6em]">
        <Skeleton className="h-[2em] w-[16em]" />
        <Skeleton className="h-[1em] w-[28em] max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-[1em] lg:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => <Skeleton key={i} className="h-[7em]" />)}
      </div>
      <Skeleton className="h-[18em]" />
    </div>
  );
}
