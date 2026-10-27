"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { Badge, Button, Modal, SelectInput, toast } from "@/components/ui";
import { downloadFile } from "@/components/app/_kit/csv";
import { db, useCollection } from "@/lib/db";
import { useCurrentUser } from "@/lib/use-current-user";
import { int } from "@/lib/format";
import { cn } from "@/lib/utils";

const FIELDS = [
  { key: "lastName", label: "Nom", required: true, aliases: ["nom", "nom de famille", "last name", "lastname"] },
  { key: "firstName", label: "Prénom", required: true, aliases: ["prenom", "first name", "firstname"] },
  { key: "position", label: "Poste", aliases: ["poste", "fonction", "intitule"] },
  { key: "hireDate", label: "Date d'embauche", aliases: ["date d'embauche", "embauche", "date embauche", "date entree"] },
  { key: "contract", label: "Contrat", aliases: ["contrat", "type de contrat"] },
  { key: "email", label: "Email", aliases: ["email", "e-mail", "mail"] },
  { key: "phone", label: "Téléphone", aliases: ["telephone", "tel", "mobile"] },
  { key: "cnasNumber", label: "N° CNAS", aliases: ["n° cnas", "cnas", "numero cnas", "n cnas"] },
  { key: "nin", label: "NIN", aliases: ["nin", "n° d'identification nationale", "identifiant national"] },
];

const SAMPLE = [
  "Nom;Prénom;Poste;Date d'embauche;Contrat;Email;Téléphone;N° CNAS;NIN",
  "Belhadj;Rachid;Opérateur de production;03/11/2026;CDD;rachid.belhadj@exemple.dz;0550 12 34 56;160123456789;119850123456789012",
  "Zaoui;Amel;Assistante RH;03/11/2026;CDI;amel.zaoui@exemple.dz;0661 98 76 54;160987654321;119920987654321098",
  "Ouchene;Massinissa;Développeur;10/11/2026;CDI;m.ouchene@exemple.dz;0772 45 67 89;;1199001234567890",
  ";Nacera;Comptable;10/11/2026;CDI;nacera@exemple.dz;0555 11 22 33;160555666777;119880555666777888",
  "Hamidi;Lyes;Technicien support;17/11/2026;ANEM;lyes.hamidi@exemple.dz;0540 22 33 44;160444555666;119950444555666777",
].join("\n");

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function parseCsv(text) {
  const clean = text.replace(/^﻿/, "").trim();
  if (!clean) return { headers: [], rows: [] };
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  const sep = (lines[0].match(/;/g) ?? []).length >= (lines[0].match(/,/g) ?? []).length ? ";" : ",";
  const split = (line) => {
    const out = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
      } else if (ch === sep && !quoted) { out.push(cur); cur = ""; } else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };
  const [head, ...body] = lines.map(split);
  return { headers: head, rows: body };
}

function autoMap(headers) {
  const map = {};
  FIELDS.forEach((f) => {
    const idx = headers.findIndex((h) => f.aliases.includes(norm(h)) || norm(h) === norm(f.label));
    map[f.key] = idx >= 0 ? String(idx) : "";
  });
  return map;
}

export default function ImportModal({ open, onClose }) {
  const { employee: me } = useCurrentUser();
  const employees = useCollection("employees");
  const [file, setFile] = useState(null); // { name, headers, rows }
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  const reset = () => { setFile(null); setMapping({}); setError(""); };
  const close = () => { reset(); onClose(); };

  const load = (name, text) => {
    const parsed = parseCsv(text);
    if (!parsed.headers.length || !parsed.rows.length) {
      setError("Le fichier est vide ou illisible. Vérifiez qu'il contient une ligne d'en-têtes et au moins une ligne de données.");
      return;
    }
    setError("");
    setFile({ name, ...parsed });
    setMapping(autoMap(parsed.headers));
  };

  const onFile = async (f) => {
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) {
      setError("Format non pris en charge dans cette démo. Enregistrez votre fichier Excel au format CSV (séparateur point-virgule) puis réessayez.");
      return;
    }
    load(f.name, await f.text());
  };

  const analysis = useMemo(() => {
    if (!file) return null;
    const get = (row, key) => (mapping[key] !== "" && mapping[key] != null ? (row[Number(mapping[key])] ?? "").trim() : "");
    const existingNin = new Set(employees.map((e) => e.nin).filter(Boolean));
    const existingCnas = new Set(employees.map((e) => e.cnasNumber).filter(Boolean));
    const issues = [];
    let valid = 0;
    file.rows.forEach((row, i) => {
      const line = i + 2;
      const rowIssues = [];
      FIELDS.filter((f) => f.required).forEach((f) => { if (!get(row, f.key)) rowIssues.push({ line, field: f.label, message: "Valeur obligatoire manquante", level: "error" }); });
      const nin = get(row, "nin");
      if (nin && !/^\d{18}$/.test(nin)) rowIssues.push({ line, field: "NIN", message: `18 chiffres attendus (${nin.length} saisis)`, level: "warning" });
      if (nin && existingNin.has(nin)) rowIssues.push({ line, field: "NIN", message: "Doublon : ce NIN existe déjà", level: "error" });
      const cnas = get(row, "cnasNumber");
      if (cnas && existingCnas.has(cnas)) rowIssues.push({ line, field: "N° CNAS", message: "Doublon : ce numéro existe déjà", level: "error" });
      if (!cnas) rowIssues.push({ line, field: "N° CNAS", message: "Manquant — le dossier sera marqué incomplet", level: "warning" });
      if (!rowIssues.some((x) => x.level === "error")) valid += 1;
      issues.push(...rowIssues);
    });
    const unmappedRequired = FIELDS.filter((f) => f.required && mapping[f.key] === "");
    return { valid, total: file.rows.length, issues, errors: issues.filter((x) => x.level === "error").length, unmappedRequired, get };
  }, [file, mapping, employees]);

  const confirm = () => {
    db.audit(me?.id, "Import de salariés (simulation)", file.name, `${analysis.valid} ligne(s) valides sur ${analysis.total}`);
    toast.info(`Import simulé : ${int(analysis.valid)} employé${analysis.valid > 1 ? "s" : ""} prêt${analysis.valid > 1 ? "s" : ""}. Aucune donnée n'est modifiée dans cette démo.`);
    close();
  };

  const headerOptions = file ? file.headers.map((h, i) => ({ value: String(i), label: h || `Colonne ${i + 1}` })) : [];

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Importer des employés"
      description={file ? `${file.name} · ${int(file.rows.length)} ligne${file.rows.length > 1 ? "s" : ""} détectée${file.rows.length > 1 ? "s" : ""}` : "Fichier CSV (exportez votre Excel en « CSV séparateur point-virgule »)."}
      footer={
        file ? (
          <>
            <Button variant="ghost" icon={RotateCcw} onClick={reset}>Changer de fichier</Button>
            <Button onClick={confirm} disabled={!analysis || analysis.valid === 0 || analysis.unmappedRequired.length > 0}>
              Importer {analysis ? int(analysis.valid) : 0} employé{analysis?.valid > 1 ? "s" : ""}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={close}>Fermer</Button>
        )
      }
    >
      {!file ? (
        <div className="flex flex-col gap-[1em]">
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-[0.6em] rounded-lg border-2 border-dashed px-[1.5em] py-[2.5em] text-center transition-colors duration-150",
              "focus-within:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--ring)] hover:bg-surface-hover",
              drag ? "border-ring bg-primary-soft" : "border-border-strong bg-surface-2",
            )}
          >
            <Upload className="size-[2em] text-pine-600" aria-hidden strokeWidth={1.5} />
            <span className="font-medium text-fg">Déposez votre fichier ici ou cliquez pour parcourir</span>
            <span className="text-sm text-fg-muted">CSV · encodage UTF-8 · 1ère ligne = en-têtes</span>
            <input type="file" accept=".csv,.txt,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>

          {error && (
            <p role="alert" className="flex items-start gap-[0.6em] rounded-md bg-danger-bg px-[0.9em] py-[0.7em] text-sm text-danger-fg">
              <AlertTriangle className="mt-[0.15em] size-[1.1em] shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-[0.6em]">
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => load("exemple-import.csv", SAMPLE)}>Essayer avec un exemple</Button>
            <Button variant="ghost" icon={Download} onClick={() => downloadFile("modele-import-employes.csv", `﻿${SAMPLE.split("\n")[0]}\r\n`)}>Télécharger le modèle</Button>
          </div>
          <p className="text-sm text-fg-muted">Les colonnes sont reconnues automatiquement et vous pourrez corriger la correspondance avant de valider. Les doublons de NIN et de N° CNAS sont détectés.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[1.25em]">
          <section aria-labelledby="map-title">
            <h3 id="map-title" className="mb-[0.6em] text-h3 font-semibold text-fg">Correspondance des colonnes</h3>
            <div className="grid gap-[0.8em] sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <SelectInput
                  key={f.key}
                  label={f.label}
                  required={f.required}
                  value={mapping[f.key] ?? ""}
                  onChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}
                  placeholder="— Ignorer —"
                  options={headerOptions}
                  error={f.required && mapping[f.key] === "" ? "Colonne requise" : undefined}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="preview-title">
            <div className="mb-[0.6em] flex flex-wrap items-center justify-between gap-[0.6em]">
              <h3 id="preview-title" className="text-h3 font-semibold text-fg">Aperçu</h3>
              <div className="flex gap-[0.4em]">
                <Badge tone="success" icon={CheckCircle2}>{int(analysis.valid)} valide{analysis.valid > 1 ? "s" : ""}</Badge>
                {analysis.errors > 0 && <Badge tone="danger" icon={AlertTriangle}>{int(analysis.errors)} erreur{analysis.errors > 1 ? "s" : ""}</Badge>}
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="h-[2.4em] bg-bg-sunken text-start text-xs font-semibold text-fg-muted">
                    <th className="px-[0.8em] text-start">#</th>
                    {FIELDS.filter((f) => mapping[f.key] !== "").map((f) => <th key={f.key} className="px-[0.8em] text-start">{f.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {file.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="h-[2.3em] border-t border-border-subtle">
                      <td className="px-[0.8em] text-fg-muted num">{i + 2}</td>
                      {FIELDS.filter((f) => mapping[f.key] !== "").map((f) => {
                        const v = analysis.get(row, f.key);
                        return <td key={f.key} className={cn("max-w-[14em] truncate px-[0.8em]", !v && f.required ? "text-danger-fg" : "text-fg")}>{v || "—"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {file.rows.length > 5 && <p className="mt-[0.4em] text-xs text-fg-muted">+ {int(file.rows.length - 5)} autres lignes</p>}
          </section>

          {analysis.issues.length > 0 && (
            <section aria-labelledby="issues-title">
              <h3 id="issues-title" className="mb-[0.6em] text-h3 font-semibold text-fg">Contrôles ({int(analysis.issues.length)})</h3>
              <ul className="flex max-h-[11em] flex-col overflow-y-auto rounded-lg border border-border text-sm">
                {analysis.issues.map((it, i) => (
                  <li key={i} className="flex items-center gap-[0.8em] border-t border-border-subtle px-[0.9em] py-[0.5em] first:border-t-0">
                    <span className="w-[4.5em] shrink-0 text-fg-muted num">Ligne {it.line}</span>
                    <Badge tone={it.level === "error" ? "danger" : "warning"} icon={AlertTriangle}>{it.level === "error" ? "Erreur" : "À vérifier"}</Badge>
                    <span className="font-medium text-fg">{it.field}</span>
                    <span className="min-w-0 text-fg-secondary">{it.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
