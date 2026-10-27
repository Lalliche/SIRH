import { cn } from "@/lib/utils";

// Arch-framed empty state (design-system signature). Practical copy, one primary action.
export default function EmptyState({ icon: Icon, title, description, action, secondary, className }) {
  return (
    <div className={cn("flex flex-col items-center px-[1.5em] py-[3em] text-center", className)}>
      <div
        aria-hidden
        className="mb-[1.25em] flex h-[7em] w-[5.6em] items-end justify-center bg-primary-soft pb-[1.2em]"
        style={{ borderRadius: "50% 50% 0 0 / 38% 38% 0 0" }}
      >
        {Icon && <Icon className="size-[2.2em] text-pine-600" strokeWidth={1.4} />}
      </div>
      <h3 className="text-h3 font-semibold text-fg">{title}</h3>
      {description && <p className="mt-[0.4em] max-w-[44ch] text-sm text-fg-secondary">{description}</p>}
      {(action || secondary) && <div className="mt-[1.2em] flex flex-wrap justify-center gap-[0.6em]">{action}{secondary}</div>}
    </div>
  );
}
