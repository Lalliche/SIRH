"use client";

import { useId } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-border-strong bg-surface px-[0.875em] text-[0.9375em] text-fg placeholder:text-fg-muted " +
  "transition-[border-color,box-shadow] duration-150 hover:border-fg-faint focus-visible:border-ring focus-visible:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--ring)] " +
  "disabled:opacity-50 aria-[invalid=true]:border-danger";

export function Field({ label, hint, error, required, htmlFor, className, children }) {
  return (
    <div className={cn("flex flex-col gap-[0.4em]", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[0.8125em] font-medium text-fg-secondary">
          {label}
          {required && <span className="ms-[0.4em] font-normal text-fg-muted">(obligatoire)</span>}
        </label>
      )}
      {children}
      {error ? <p role="alert" className="text-[0.8125em] text-danger-fg">{error}</p> : hint && <p className="text-[0.8125em] text-fg-muted">{hint}</p>}
    </div>
  );
}

// onChange receives the VALUE, not the event.
export function TextInput({ label, hint, error, required, onChange, className, suffix, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <div className="relative">
        <input id={id} aria-invalid={!!error} onChange={(e) => onChange?.(e.target.value)} className={cn(control, "h-[2.75em]", suffix && "pe-[3.2em]")} {...props} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 end-[0.9em] flex items-center text-[0.8125em] text-fg-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

export function TextArea({ label, hint, error, required, onChange, className, rows = 4, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <textarea id={id} rows={rows} aria-invalid={!!error} onChange={(e) => onChange?.(e.target.value)} className={cn(control, "py-[0.7em]")} {...props} />
    </Field>
  );
}

export function SelectInput({ label, hint, error, required, onChange, options, placeholder, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <div className="relative">
        <select id={id} aria-invalid={!!error} onChange={(e) => onChange?.(e.target.value)} className={cn(control, "h-[2.75em] appearance-none pe-[2.4em]")} {...props}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute end-[0.8em] top-1/2 size-[1.1em] -translate-y-1/2 text-fg-muted" />
      </div>
    </Field>
  );
}

export function SearchInput({ onChange, className, placeholder = "Rechercher…", ...props }) {
  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden className="pointer-events-none absolute start-[0.85em] top-1/2 size-[1.1em] -translate-y-1/2 text-fg-muted" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(control, "h-[2.5em] ps-[2.5em] text-[0.875em]")}
        {...props}
      />
    </div>
  );
}

export function Toggle({ checked, onChange, label, size = "md" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200",
        size === "sm" ? "h-[1.25em] w-[2.15em]" : "h-[1.5em] w-[2.6em]",
        checked ? "bg-primary" : "bg-border-strong",
      )}
    >
      <span
        className={cn(
          "absolute rounded-full bg-white shadow-sm transition-[inset-inline-start] duration-200 ease-out-soft",
          size === "sm" ? "size-[0.95em]" : "size-[1.15em]",
          checked ? (size === "sm" ? "start-[1.05em]" : "start-[1.3em]") : "start-[0.17em]",
        )}
      />
    </button>
  );
}

export function Checkbox({ checked, onChange, label, className }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-[0.6em] text-sm text-fg-secondary", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange?.(e.target.checked)} className="size-[1.1em] cursor-pointer rounded-xs accent-[var(--primary)]" />
      {label}
    </label>
  );
}

export function Segmented({ value, onChange, options, className, size = "md" }) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-md bg-bg-sunken p-[0.2em]", className)}>
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-[0.4em] px-[0.9em] font-medium transition-[background-color,color,box-shadow] duration-150",
              size === "sm" ? "h-[1.9em] text-[0.8125em]" : "h-[2.1em] text-[0.875em]",
              active ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
