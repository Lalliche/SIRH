import { cn } from "@/lib/utils";

export default function Card({ as: Tag = "div", interactive = false, padded = true, className, children, ...props }) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-border bg-surface shadow-sm",
        padded && "p-[1.5em]",
        interactive && "transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn("mb-[1.1em] flex items-start justify-between gap-[1em]", className)}>
      <div className="min-w-0">
        <h3 className="text-h3 font-semibold text-fg">{title}</h3>
        {description && <p className="mt-[0.15em] text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
