import { Fragment } from "react";

// Mini formatter for assistant answers: **bold** and line breaks. Closes a dangling ** while streaming.
export default function RichText({ text }) {
  const safe = (text.match(/\*\*/g) ?? []).length % 2 ? `${text}**` : text;
  return safe.split("\n").map((line, i) => (
    <p key={i} className={i ? "mt-[0.45em]" : undefined}>
      {line.split(/\*\*(.+?)\*\*/g).map((part, j) => (j % 2 ? <strong key={j} className="font-semibold text-fg">{part}</strong> : <Fragment key={j}>{part}</Fragment>))}
    </p>
  ));
}
