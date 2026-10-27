import { cn } from "@/lib/utils";

export default function PageHeader({ title, description, actions, eyebrow, className }) {
  return (
    <div className={cn("mb-[1.75em] flex flex-wrap items-end justify-between gap-[1em]", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-[0.4em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">{eyebrow}</p>}
        <h1 className="text-h1 font-semibold text-fg">{title}</h1>
        {description && <p className="mt-[0.3em] max-w-[60ch] text-fg-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-[0.6em]">{actions}</div>}
    </div>
  );
}
