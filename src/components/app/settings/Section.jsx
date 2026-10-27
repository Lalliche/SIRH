import { Card } from "@/components/ui";

/** Titled settings card. `footer` renders a sticky-looking save bar inside the card. */
export default function Section({ title, description, action, footer, children }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-[1em] border-b border-border-subtle px-[1.5em] py-[1.1em]">
        <div>
          <h2 className="text-h3 font-semibold text-fg">{title}</h2>
          {description && <p className="mt-[0.2em] max-w-[60ch] text-sm text-fg-muted">{description}</p>}
        </div>
        {action}
      </header>
      <div className="px-[1.5em] py-[1.25em]">{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-end gap-[0.6em] border-t border-border-subtle bg-bg-sunken px-[1.5em] py-[0.9em]">{footer}</footer>}
    </Card>
  );
}
