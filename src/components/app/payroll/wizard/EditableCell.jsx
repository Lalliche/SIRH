"use client";

import { useRef, useState } from "react";
import { Button, TextInput } from "@/components/ui";
import { amount } from "@/lib/format";
import { cn } from "@/lib/utils";

const parse = (raw) => {
  const n = Number(String(raw).replace(/\s| /g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Inline-edit cell (design-system: Enter / double-click to edit, Esc cancels, blur or Enter saves).
 * Display state is a ghost Button so the grid stays keyboard-navigable with Tab.
 */
export default function EditableCell({ value, onCommit, label, unit, decimals = 0, edited = false, source, className }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const skip = useRef(false);

  const start = () => {
    setText(value ? String(value).replace(".", ",") : "");
    setEditing(true);
  };
  const commit = () => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    const n = text.trim() === "" ? 0 : parse(text);
    setEditing(false);
    if (n != null && n !== value) onCommit(n);
  };

  if (editing) {
    return (
      <TextInput
        autoFocus
        inputMode="decimal"
        aria-label={label}
        value={text}
        onChange={setText}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            skip.current = true;
            setEditing(false);
          }
        }}
        suffix={unit}
        className="w-[7.5em] text-end"
      />
    );
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={start}
      onDoubleClick={start}
      aria-label={`${label} : ${value ? amount(value, { decimals }) : "aucune valeur"}. Modifier`}
      title={source}
      className={cn("w-full justify-end !px-[0.5em] font-normal num", !value && "text-fg-faint", edited && "bg-primary-soft text-link", className)}
    >
      {value ? amount(value, { decimals }) : "—"}
      {unit && value ? <span className="text-fg-muted">{unit}</span> : null}
    </Button>
  );
}
