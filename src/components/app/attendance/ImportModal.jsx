"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Badge, Button, Modal, toast } from "@/components/ui";
import FileDrop from "@/components/app/leave/FileDrop";
import { TODAY } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { useCollection } from "@/lib/db";
import { date } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { applyPunches } from "./attendance-actions";
import { fromMin, toMin } from "./attendance-utils";

const YESTERDAY = addDays(TODAY, -1);

function sampleCsv(employees) {
  const rows = ["matricule;date;heure"];
  employees.filter((e) => e.status !== "sorti").slice(0, 9).forEach((e, i) => {
    rows.push(`${e.matricule};${YESTERDAY};07:${String(40 + (i * 3) % 20).padStart(2, "0")}`);
    rows.push(`${e.matricule};${YESTERDAY};17:${String((i * 7) % 40).padStart(2, "0")}`);
  });
  rows.push(`TI-9999;${YESTERDAY};08:00`); // unknown badge, to show the error list
  return rows.join("\n");
}

export function parsePunches(text, employees) {
  const byMat = Object.fromEntries(employees.map((e) => [e.matricule.toUpperCase(), e]));
  const groups = new Map();
  const unknown = new Set();
  let lines = 0;
  text.split(/\r?\n/).forEach((line) => {
    const [mat, d, t] = line.split(/[;,\t]/).map((x) => x?.trim());
    if (!mat || !/^\d{4}-\d{2}-\d{2}$/.test(d ?? "") || toMin(t) == null) return;
    lines += 1;
    const e = byMat[mat.toUpperCase()];
    if (!e) return unknown.add(mat);
    const k = `${e.id}|${d}`;
    groups.set(k, [...(groups.get(k) ?? []), toMin(t)]);
  });
  const punches = [...groups.entries()].map(([k, mins]) => {
    const [employeeId, d] = k.split("|");
    const lo = Math.min(...mins);
    const hi = Math.max(...mins);
    return { employeeId, date: d, in: fromMin(lo), out: hi - lo >= 30 ? fromMin(hi) : null };
  });
  return { lines, punches, unknown: [...unknown] };
}

export default function ImportModal({ open, onClose, device }) {
  const me = useCurrentUser();
  const employees = useCollection("employees");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const result = useMemo(() => (text ? parsePunches(text, employees) : null), [text, employees]);

  const reset = () => { setFile(null); setText(""); setError(""); };
  const close = () => { reset(); onClose(); };
  const pick = (f) => {
    setFile(f);
    setError("");
    if (!f) return setText("");
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.onerror = () => setError("Fichier illisible. Exportez-le à nouveau depuis le terminal.");
    reader.readAsText(f);
  };
  const useSample = () => { setFile({ name: "pointages-exemple.csv", size: 420 }); setText(sampleCsv(employees)); setError(""); };

  const run = () => {
    if (!result?.punches.length) return setError("Aucun pointage exploitable : vérifiez le format matricule;date;heure.");
    const undo = applyPunches(result.punches, me, device ?? "Import CSV");
    toast.success(`${result.punches.length} journée(s) de pointage importée(s)`, { action: { label: "Annuler", onClick: undo } });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Importer le fichier de pointage"
      description={device ? `Terminal : ${device}` : "Export CSV d'un terminal ZKTeco (une ligne par badgeage)."}
      footer={
        <>
          <Button variant="ghost" onClick={close}>Annuler</Button>
          <Button icon={FileSpreadsheet} disabled={!result?.punches.length} onClick={run}>Importer {result?.punches.length ? `(${result.punches.length})` : ""}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[1em]">
        <FileDrop value={file} onChange={pick} accept=".csv,.txt,.dat" label="Choisir un fichier" hint="Format : matricule;date;heure, un badgeage par ligne (CSV, TXT)." error={!!error} />
        {!file && <div className="flex items-center gap-[0.6em] text-sm text-fg-secondary">Pas de fichier sous la main ? <Button variant="soft" size="sm" onClick={useSample}>Utiliser un fichier d’exemple</Button></div>}
        {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}
        {result && (
          <div className="rounded-lg border border-border bg-surface-2 p-[1em]" aria-live="polite">
            <div className="flex flex-wrap items-center gap-[0.5em] text-sm">
              <Badge tone="success">{result.punches.length} journée(s) prête(s)</Badge>
              <Badge tone="neutral">{result.lines} badgeages lus</Badge>
              {result.unknown.length > 0 && <Badge tone="warning">{result.unknown.length} badge(s) inconnu(s)</Badge>}
            </div>
            {result.unknown.length > 0 && <p className="mt-[0.6em] text-sm text-warning-fg">Ignorés : {result.unknown.join(", ")}. Associez ces badges à un salarié dans sa fiche.</p>}
            <ul className="mt-[0.8em] flex flex-col gap-[0.3em] text-sm text-fg-secondary">
              {result.punches.slice(0, 4).map((p) => {
                const e = employees.find((x) => x.id === p.employeeId);
                return <li key={p.employeeId + p.date} className="flex justify-between gap-[1em]"><span className="truncate">{e?.firstName} {e?.lastName}</span><span className="num">{date(p.date)} · {p.in} → {p.out ?? "—"}</span></li>;
              })}
              {result.punches.length > 4 && <li className="text-xs text-fg-muted">et {result.punches.length - 4} autres…</li>}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
