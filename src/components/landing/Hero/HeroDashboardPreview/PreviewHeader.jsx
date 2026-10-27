import { ArchMark } from "@/components/shared/Logo";
import { Segmented } from "@/components/ui";

export default function PreviewHeader({ view, onViewChange, identity }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-[0.8em] border-b border-border-subtle bg-bg-sunken px-[1.1em] py-[0.8em]">
      <div className="flex items-center gap-[0.6em]">
        <ArchMark className="size-[1.4em]" />
        <div className="leading-tight">
          <p className="text-[0.82em] font-semibold text-fg">{identity.name}</p>
          <p className="text-[0.72em] text-fg-muted">{identity.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-[0.8em]">
        <Segmented
          size="sm"
          value={view}
          onChange={onViewChange}
          options={[
            { value: "admin", label: "Admin" },
            { value: "employee", label: "Employé" },
          ]}
        />
        <span className="inline-flex items-center gap-[0.5em] rounded-pill border border-border bg-surface px-[0.75em] py-[0.3em] font-mono text-[0.68em] font-medium text-fg-secondary">
          <span aria-hidden className="relative flex size-[0.5em]">
            <span className="sirh-ping absolute inset-0 rounded-full bg-pine-500" />
            <span className="relative size-full rounded-full bg-pine-500" />
          </span>
          Démo en direct
        </span>
      </div>
    </div>
  );
}
