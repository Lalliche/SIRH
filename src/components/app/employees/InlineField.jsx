"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Button, SelectInput, TextInput } from "@/components/ui";
import { cn } from "@/lib/utils";

function Editor({ label, type, options, initial, validate, onSave, onCancel, mono, suffix }) {
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState("");
  const submit = () => {
    const message = validate?.(value);
    if (message) return setError(message);
    onSave(value);
  };
  const keys = {
    onKeyDown: (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
      if (e.key === "Escape") { e.stopPropagation(); onCancel(); }
    },
  };
  return (
    <div className="flex w-full max-w-[24em] items-start justify-end gap-[0.4em]">
      <div className="min-w-0 flex-1">
        {options ? (
          <SelectInput aria-label={label} autoFocus value={value} onChange={(v) => { setValue(v); setError(""); }} options={options} error={error} {...keys} />
        ) : (
          <TextInput
            aria-label={label}
            autoFocus
            type={type}
            value={value}
            suffix={suffix}
            error={error}
            onChange={(v) => { setValue(v); setError(""); }}
            className={mono ? "[&_input]:font-mono" : undefined}
            {...keys}
          />
        )}
      </div>
      <Button size="icon" icon={Check} aria-label={`Enregistrer ${label}`} onClick={submit} className="mt-[0.1em]" />
      <Button size="icon" variant="ghost" icon={X} aria-label="Annuler" onClick={onCancel} className="mt-[0.1em]" />
    </div>
  );
}

/**
 * Definition row with click-to-edit. Controlled from the profile (`editingId`) so other widgets can open an editor.
 * `onSave(value)` receives the raw string from the input.
 */
export default function InlineField({ id, label, value, display, editable, editingId, setEditingId, onSave, type = "text", options, validate, mono, suffix, emphasize, hint, alwaysShow }) {
  const editing = editingId === id;
  const shown = display ?? (value === "" || value == null ? null : String(value));
  return (
    <div className="group/row flex items-baseline justify-between gap-[1em] border-b border-border-subtle py-[0.6em] last:border-b-0">
      <dt className="shrink-0 pt-[0.1em] text-sm text-fg-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-end">
        {editing ? (
          <Editor
            label={label}
            type={type}
            options={options}
            initial={value}
            validate={validate}
            mono={mono}
            suffix={suffix}
            onCancel={() => setEditingId(null)}
            onSave={(v) => { onSave(v); setEditingId(null); }}
          />
        ) : (
          <span className="inline-flex max-w-full items-center justify-end gap-[0.4em]">
            {shown ? (
              <span className={cn("min-w-0 truncate text-fg", mono && "font-mono text-code", emphasize && "font-semibold")}>{shown}</span>
            ) : (
              <span className="inline-flex items-center gap-[0.4em] text-warning-fg">
                <span aria-hidden className="size-[0.45em] rounded-full bg-warning" />
                Non renseigné
              </span>
            )}
            {editable && (
              <Button
                variant="ghost"
                size="icon"
                icon={Pencil}
                aria-label={`Modifier ${label}`}
                onClick={() => setEditingId(id)}
                className={cn("!size-[1.9em] transition-opacity duration-150 focus-visible:opacity-100 group-hover/row:opacity-100 max-md:opacity-100", alwaysShow ? "opacity-100" : "opacity-0")}
              />
            )}
          </span>
        )}
        {!editing && hint && <span className="mt-[0.1em] block text-xs text-fg-muted">{hint}</span>}
      </dd>
    </div>
  );
}
