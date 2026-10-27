"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const size = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(n / 1e3))} Ko`);

/** Mock file upload: keeps the File in state, only the name is persisted by callers. */
export default function FileDrop({ value, onChange, accept, hint, label = "Ajouter un fichier", className, error }) {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  const take = (f) => f && onChange(f);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
      className={cn(
        "rounded-lg border border-dashed bg-surface-2 p-[1em] transition-colors duration-150",
        over ? "border-ring bg-primary-soft" : error ? "border-danger" : "border-border-strong",
        className,
      )}
    >
      <input ref={ref} type="file" accept={accept} tabIndex={-1} aria-hidden className="sr-only" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      {value ? (
        <div className="flex items-center gap-[0.75em]">
          <FileText className="size-[1.4em] shrink-0 text-pine-600" aria-hidden strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{value.name}</p>
            {value.size != null && <p className="text-xs text-fg-muted">{size(value.size)}</p>}
          </div>
          <Button variant="ghost" size="icon" aria-label="Retirer le fichier" onClick={() => onChange(null)}><X className="size-[1.1em]" /></Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-[0.75em]">
          <Upload className="size-[1.3em] shrink-0 text-fg-muted" aria-hidden strokeWidth={1.5} />
          <p className="min-w-0 flex-1 text-sm text-fg-secondary">
            Glissez un fichier ici{hint && <span className="block text-xs text-fg-muted">{hint}</span>}
          </p>
          <Button variant="secondary" size="sm" onClick={() => ref.current?.click()}>{label}</Button>
        </div>
      )}
    </div>
  );
}
